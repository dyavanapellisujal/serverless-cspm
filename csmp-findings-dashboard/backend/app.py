from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson.objectid import ObjectId
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
import random
import boto3
from botocore.exceptions import ClientError

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'csmp_findings')
COLLECTION_NAME = os.getenv('COLLECTION_NAME', 's3_audit_findings')

try:
    client = MongoClient(MONGO_URI)
    db = client[DATABASE_NAME]
    collection = db[COLLECTION_NAME]
    print(f"Connected to MongoDB: {DATABASE_NAME}")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None
    db = None
    collection = None

# Custom JSON serialization for MongoDB ObjectId and datetime
def custom_json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

app.json.default = custom_json_serializer

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    mongo_status = "connected" if client else "disconnected"
    return jsonify({
        "status": "healthy",
        "mongodb": mongo_status,
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/findings', methods=['GET'])
def get_findings():
    """Get all security findings with optional filtering"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        # Get query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        severity = request.args.get('severity')
        service = request.args.get('service')
        status = request.args.get('status')
        search = request.args.get('search')
        
        # Build filter query
        filter_query = {}
        
        if severity:
            filter_query['severity'] = severity
        if service:
            filter_query['service'] = service
        if status:
            filter_query['status'] = status
        if search:
            filter_query['$or'] = [
                {'title': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'resource_id': {'$regex': search, '$options': 'i'}}
            ]
        
        # Calculate skip value for pagination
        skip = (page - 1) * limit
        
        # Get total count
        total_count = collection.count_documents(filter_query)
        
        # Get findings with pagination
        findings = list(collection.find(filter_query)
                       .sort('timestamp', -1)
                       .skip(skip)
                       .limit(limit))
        
        # Convert ObjectId to string for JSON serialization
        for finding in findings:
            finding['_id'] = str(finding['_id'])
            if 'timestamp' in finding and isinstance(finding['timestamp'], datetime):
                finding['timestamp'] = finding['timestamp'].isoformat()
        
        return jsonify({
            "findings": findings,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/findings/<finding_id>', methods=['GET'])
def get_finding_by_id(finding_id):
    """Get a specific finding by ID"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        finding = collection.find_one({"_id": ObjectId(finding_id)})
        is_deleted = False
        
        if not finding:
            # Check deleted logs
            db = client[DATABASE_NAME]
            logs_collection = db['s3_audit_logs']
            finding_log = logs_collection.find_one({"_id": ObjectId(finding_id)})
            if finding_log:
                # The log is an array of findings under 'findings', or sometimes it's grouped.
                # Oh wait, the log itself is saved directly!
                finding = finding_log
                is_deleted = True
            else:
                return jsonify({"error": "Finding not found"}), 404
        
        finding['_id'] = str(finding['_id'])
        finding['is_archived_log'] = is_deleted
        if 'timestamp' in finding and isinstance(finding['timestamp'], datetime):
            finding['timestamp'] = finding['timestamp'].isoformat()
        if 'deleted_at' in finding and isinstance(finding['deleted_at'], datetime):
            finding['deleted_at'] = finding['deleted_at'].isoformat()
        
        return jsonify(finding)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/findings/<finding_id>/status', methods=['PUT'])
def update_finding_status(finding_id):
    """Update the status of a finding"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({"error": "Status is required"}), 400
        
        result = collection.update_one(
            {"_id": ObjectId(finding_id)},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({"error": "Finding not found"}), 404
        
        return jsonify({"message": "Status updated successfully"})
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/findings/<finding_id>/remediate', methods=['POST'])
def remediate_finding(finding_id):
    """Remediate a resource based on a finding (e.g., delete S3 bucket)"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        # Find the finding first
        finding = collection.find_one({"_id": ObjectId(finding_id)})
        if not finding:
            return jsonify({"error": "Finding not found"}), 404
            
        data = request.get_json()
        confirmation = data.get('confirmation')
        
        if confirmation != "DELETE":
            return jsonify({"error": "Confirmation 'DELETE' is required for this destructive action"}), 400

        service = finding.get('service')
        resource_name = finding.get('resource_name') or finding.get('bucket_name') or finding.get('resource_id')
        
        # Remediation logic based on service
        # Note: In a production environment, you would use more granular actions (e.g., fix policy instead of delete)
        # But per user request, we implement deletion as a remediation path.
        
        success = False
        message = ""
        
        try:
            if service == 'S3':
                s3 = boto3.client('s3')
                # For S3, we need to delete objects first as bucket must be empty
                try:
                    # In a real app, you might want a recursive delete tool or clear bucket logic
                    # Here we attempt to delete the bucket. If it's not empty, it will fail unless we empty it.
                    # For safety in this demo, we'll try to delete.
                    s3.delete_bucket(Bucket=resource_name)
                    success = True
                    message = f"Successfully deleted S3 bucket: {resource_name}"
                except ClientError as e:
                    if e.response['Error']['Code'] == 'BucketNotEmpty':
                        # Optional: list and delete objects? (Too destructive?)
                        # For now, just report the error.
                        message = f"Failed to delete S3 bucket {resource_name}: Bucket is not empty."
                        success = False
                    else:
                        message = f"AWS Error: {e.response['Error']['Message']}"
                        success = False
            
            elif service == 'EC2':
                ec2 = boto3.client('ec2')
                # Check both possible field names for the ID
                res_id = finding.get('resource_id') or finding.get('resource_name')
                
                if not res_id:
                    return jsonify({"error": f"No resource_id or resource_name found for EC2 finding {id}"}), 400
                
                if res_id.startswith('sg-'):
                    # Handle Security Group deletion
                    ec2.delete_security_group(GroupId=res_id)
                    success = True
                    message = f"Successfully deleted Security Group: {res_id}"
                else:
                    # Handle Instance termination
                    ec2.terminate_instances(InstanceIds=[res_id])
                    success = True
                    message = f"Successfully terminated EC2 instance: {res_id}"
            
            elif service == 'KMS':
                kms = boto3.client('kms')
                kms.schedule_key_deletion(KeyId=resource_name, PendingWindowInDays=7)
                success = True
                message = f"Successfully scheduled KMS key deletion for: {resource_name}"
            
            else:
                message = f"Auto-remediation not implemented for service: {service}"
                success = False
                
        except Exception as e:
            message = f"Remediation error: {str(e)}"
            success = False

        if success:
            # Move finding to s3_audit_logs (archive)
            db = client[DATABASE_NAME]
            logs_collection = db['s3_audit_logs']
            
            log_entry = finding.copy()
            log_entry['remediated_at'] = datetime.utcnow()
            log_entry['deleted_at'] = datetime.utcnow() # To match existing report logic
            log_entry['status'] = 'resolved'
            log_entry['remediation_message'] = message
            
            # Remove from active findings
            collection.delete_one({"_id": ObjectId(finding_id)})
            
            # Insert into logs
            logs_collection.insert_one(log_entry)
            
            return jsonify({"message": message, "status": "remediated"})
        else:
            return jsonify({"error": message}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        # Get total findings count
        total_findings = collection.count_documents({})
        
        # Get findings by severity
        severity_pipeline = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        severity_stats = list(collection.aggregate(severity_pipeline))
        
        # Get findings by service
        service_pipeline = [
            {"$group": {"_id": "$service", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        service_stats = list(collection.aggregate(service_pipeline))
        
        # Get findings by status
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        status_stats = list(collection.aggregate(status_pipeline))
        
        # Get recent findings (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_findings = collection.count_documents({
            "timestamp": {"$gte": seven_days_ago}
        })
        
        return jsonify({
            "total_findings": total_findings,
            "recent_findings": recent_findings,
            "severity_distribution": severity_stats,
            "service_distribution": service_stats,
            "status_distribution": status_stats
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/findings/timeline', methods=['GET'])
def get_findings_timeline():
    """Get findings timeline data for charts"""
    if collection is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$timestamp"},
                        "month": {"$month": "$timestamp"},
                        "day": {"$dayOfMonth": "$timestamp"}
                    },
                    "count": {"$sum": 1},
                    "critical": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "CRITICAL"]}, 1, 0]}
                    },
                    "high": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "HIGH"]}, 1, 0]}
                    },
                    "medium": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "MEDIUM"]}, 1, 0]}
                    },
                    "low": {
                        "$sum": {"$cond": [{"$eq": ["$severity", "LOW"]}, 1, 0]}
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        timeline_data = list(collection.aggregate(pipeline))
        
        # Format the data for frontend consumption
        formatted_data = []
        for item in timeline_data:
            date_obj = datetime(
                item['_id']['year'],
                item['_id']['month'],
                item['_id']['day']
            )
            formatted_data.append({
                "date": date_obj.strftime("%Y-%m-%d"),
                "total": item['count'],
                "critical": item['critical'],
                "high": item['high'],
                "medium": item['medium'],
                "low": item['low']
            })
        
        return jsonify(formatted_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET', 'DELETE'])
def logs_api():
    """Get or Clear audit logs (deleted buckets/resources)"""
    if client is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        db = client[DATABASE_NAME]
        logs_collection = db['s3_audit_logs']
        
        if request.method == 'DELETE':
            logs_collection.delete_many({})
            return jsonify({"message": "Logs cleared successfully"})
            
        # GET method logic
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # Calculate skip value
        skip = (page - 1) * limit
        
        # Get total count
        total_count = logs_collection.count_documents({})
        
        # Get logs
        logs = list(logs_collection.find({})
                   .sort('deleted_at', -1)
                   .skip(skip)
                   .limit(limit))
        
        # Format logs robustly to prevent ObjectId JSON serialization errors
        def sanitize_mongo_fields(data):
            if isinstance(data, dict):
                return {k: sanitize_mongo_fields(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [sanitize_mongo_fields(i) for i in data]
            elif isinstance(data, ObjectId):
                return str(data)
            elif isinstance(data, datetime):
                return data.isoformat()
            return data

        sanitized_logs = sanitize_mongo_fields(logs)
        
        return jsonify({
            "logs": sanitized_logs,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/latest', methods=['GET'])
def get_latest_logs():
    """Get latest deleted bucket logs for notifications"""
    if client is None:
        return jsonify({"error": "Database not connected"}), 500
    
    try:
        db = client[DATABASE_NAME]
        logs_collection = db['s3_audit_logs']
        
        # Get logs from last 30 seconds (or provided seconds)
        seconds = int(request.args.get('seconds', 30))
        time_threshold = datetime.now(timezone.utc) - timedelta(seconds=seconds)
        
        logs = list(logs_collection.find({
            'deleted_at': {'$gte': time_threshold}
        }).sort('deleted_at', -1))
        
        # Format logs
        formatted_logs = []
        # Group by bucket name to avoid spamming multiple findings for same bucket deletion
        bucket_groups = {}
        
        for log in logs:
            bucket = log.get('bucket_name')
            if bucket not in bucket_groups:
                bucket_groups[bucket] = []
            bucket_groups[bucket].append(log)
            
        # Return summary per bucket
        for bucket, findings in bucket_groups.items():
            first_finding = findings[0]
            formatted_logs.append({
                'bucket_name': bucket,
                'deleted_at': first_finding.get('deleted_at').isoformat() if isinstance(first_finding.get('deleted_at'), datetime) else first_finding.get('deleted_at'),
                'finding_count': len(findings),
                'findings': [{
                    'title': f.get('title'),
                    'severity': f.get('severity'),
                    'description': f.get('description'),
                    'remediation': f.get('remediation') # For the report
                } for f in findings]
            })
            
        return jsonify({
            "logs": formatted_logs,
            "count": len(formatted_logs)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
