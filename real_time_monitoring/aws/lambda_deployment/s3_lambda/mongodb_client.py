import pymongo # type: ignore
import json
import os
from datetime import datetime, timezone
from botocore.exceptions import ClientError # type: ignore
import sys

class MongoDBClient:
    """
    MongoDB client for storing CSPM findings
    """
    
    def __init__(self, connection_string=None):
        """
        Initialize MongoDB client with connection string
        
        Args:
            connection_string: MongoDB connection string. If None, uses environment variable.
        """
        self.connection_string = connection_string or os.environ.get(
            'MONGO_URI',
            os.environ.get('MONGODB_URI',
                os.environ.get('MONGODB_CONNECTION_STRING')
            )
        )
        self.client = None
        self.db = None
        self.collection = None
        
    def connect(self, database_name='csmp_findings', collection_name='s3_audit_findings'):
        """
        Connect to MongoDB cluster and select database/collection
        
        Args:
            database_name: Name of the database to use
            collection_name: Name of the collection to use
            
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            print(f"[INFO] Connecting to MongoDB cluster...")
            print(f"[DEBUG] Python version: {sys.version}")
            try:
                print(f"[DEBUG] PyMongo version: {pymongo.version}")
            except AttributeError:
                pass
            
            # Create MongoDB client with explicit parameters for better compatibility
            self.client = pymongo.MongoClient( # type: ignore
                self.connection_string,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=5000
            )
            
            # Test the connection
            if self.client is None:
                print("[ERROR] Failed to initialize MongoDB client")
                return False

            try:
                self.client.admin.command('ping') # type: ignore
            except Exception as ping_error:
                print(f"[ERROR] MongoDB ping failed: {str(ping_error)}")
                return False

            print(f"[INFO] Successfully connected to MongoDB cluster")
            
            # Select database and collection
            if self.client:
                self.db = self.client[database_name] # type: ignore
                if self.db is not None:
                    self.collection = self.db[collection_name] # type: ignore
            
            if self.db is None or self.collection is None:
                print("[ERROR] Failed to select database or collection")
                return False

            print(f"[INFO] Using database: {database_name}, collection: {collection_name}")
            return True
            
        except Exception as e:
            print(f"[ERROR] Failed to connect to MongoDB: {str(e)}")
            print(f"[ERROR] Exception type: {type(e).__name__}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return False
            
    
    def store_finding(self, finding_data, bucket_name=None):
        """
        Store a security finding in MongoDB
        
        Args:
            finding_data: The finding data (dict or Security Hub finding format)
            bucket_name: Optional bucket name for additional metadata
            
        Returns:
            str: Document ID if successful, None if failed
        """
        try:
            if self.collection is None:
                print("[ERROR] MongoDB collection not initialized. Call connect() first.")
                return None
            
            # Prepare document for storage
            document = {
                'timestamp': datetime.now(timezone.utc),
                'bucket_name': bucket_name,
                'finding_data': finding_data,
                'source': 'cspm-s3-auditor'
            }
            
            # If finding_data is in Security Hub format, extract key information
            if isinstance(finding_data, dict) and 'Findings' in finding_data:
                findings = finding_data['Findings']
                if findings and len(findings) > 0:
                    finding = findings[0]
                    
                    # Safely extract region and service from Resources
                    region = None
                    service = 'S3' # Default
                    resources = finding.get('Resources', [])
                    if resources and len(resources) > 0 and isinstance(resources[0], dict):
                        region = resources[0].get('Region')
                        res_type = resources[0].get('Type', '')
                        if 'Ec2' in res_type:
                            service = 'EC2'
                        elif 'Iam' in res_type:
                            service = 'IAM'
                        elif 'Kms' in res_type:
                            service = 'KMS'
                    
                    document.update({
                        'finding_id': finding.get('Id'),
                        'severity': finding.get('Severity', {}).get('Label'),
                        'title': finding.get('Title'),
                        'description': finding.get('Description'),
                        'aws_account_id': finding.get('AwsAccountId'),
                        'region': region,
                        'compliance_status': finding.get('Compliance', {}).get('Status'),
                        'workflow_state': finding.get('WorkflowState'),
                        'record_state': finding.get('RecordState'),
                        # Schema alignment for Frontend
                        'resource_name': bucket_name,
                        'service': service,
                        'status': 'Open' if finding.get('Compliance', {}).get('Status') == 'FAILED' else 'Resolved'
                    })
            
            # Upsert document based on bucket_name to avoid duplicates
            result = self.collection.replace_one( # type: ignore
                {'bucket_name': bucket_name},
                document,
                upsert=True
            )
            
            if result.upserted_id:
                document_id = str(result.upserted_id)
                print(f"[INFO] Successfully stored NEW finding in MongoDB with ID: {document_id}")
            else:
                # If matched_count > 0, it means we updated an existing doc.
                # We can try to find the document to get its ID, or just return "Updated"
                # For consistency, let's try to return the ID of the updated doc if possible,
                # or just return True/a placeholder to indicate success.
                # But the caller expects an ID. Let's retrieve it.
                updated_doc = self.collection.find_one({'bucket_name': bucket_name}) # type: ignore
                document_id = str(updated_doc['_id']) if updated_doc else None
                print(f"[INFO] Successfully UPDATED finding in MongoDB for bucket: {bucket_name}")
            
            return document_id
            
        except Exception as e:
            print(f"[ERROR] Failed to store finding in MongoDB: {str(e)}")
            return None
    
    def get_findings_by_bucket(self, bucket_name, limit=10):
        """
        Retrieve findings for a specific bucket
        
        Args:
            bucket_name: Name of the S3 bucket
            limit: Maximum number of findings to return
            
        Returns:
            list: List of findings or empty list if none found
        """
        try:
            if self.collection is None:
                print("[ERROR] MongoDB collection not initialized. Call connect() first.")
                return []
            
            findings = list(self.collection.find( # type: ignore
                {'bucket_name': bucket_name}
            ).sort('timestamp', -1).limit(limit))
            
            # Convert ObjectId to string for JSON serialization
            for finding in findings:
                finding['_id'] = str(finding['_id'])
                if 'timestamp' in finding:
                    finding['timestamp'] = finding['timestamp'].isoformat()
            
            print(f"[INFO] Retrieved {len(findings)} findings for bucket: {bucket_name}")
            return findings
            
        except Exception as e:
            print(f"[ERROR] Failed to retrieve findings from MongoDB: {str(e)}")
            return []
    
    def get_recent_findings(self, limit=50):
        """
        Retrieve recent findings across all buckets
        
        Args:
            limit: Maximum number of findings to return
            
        Returns:
            list: List of recent findings
        """
        try:
            if self.collection is None:
                print("[ERROR] MongoDB collection not initialized. Call connect() first.")
                return []
            
            findings = list(self.collection.find().sort('timestamp', -1).limit(limit)) # type: ignore
            
            # Convert ObjectId to string for JSON serialization
            for finding in findings:
                finding['_id'] = str(finding['_id'])
                if 'timestamp' in finding:
                    finding['timestamp'] = finding['timestamp'].isoformat()
            
            print(f"[INFO] Retrieved {len(findings)} recent findings")
            return findings
            
        except Exception as e:
            print(f"[ERROR] Failed to retrieve recent findings from MongoDB: {str(e)}")
            return []
    
    def delete_findings_by_bucket(self, bucket_name):
        """
        Delete all findings for a specific bucket
        
        Args:
            bucket_name: Name of the S3 bucket
            
        Returns:
            int: Number of deleted documents, or -1 if failed
        """
        try:
            if self.collection is None:
                print("[ERROR] MongoDB collection not initialized. Call connect() first.")
                return -1
            
            result = self.collection.delete_many({'bucket_name': bucket_name}) # type: ignore
            deleted_count = result.deleted_count
            
            print(f"[INFO] Deleted {deleted_count} findings for bucket: {bucket_name}")
            return deleted_count
            
        except Exception as e:
            print(f"[ERROR] Failed to delete findings from MongoDB: {str(e)}")
            return -1

    def handle_bucket_deletion(self, bucket_name):
        """
        Move findings to logs collection and delete from main collection
        
        Args:
            bucket_name: Name of the S3 bucket
            
        Returns:
            int: Number of archived documents, or -1 if failed
        """
        try:
            if self.collection is None:
                print("[ERROR] MongoDB collection not initialized. Call connect() first.")
                return -1
            
            if self.db is None:
                print("[ERROR] MongoDB database not initialized.")
                return -1

            # 1. Retrieve existing findings
            findings = list(self.collection.find({'bucket_name': bucket_name})) # type: ignore
            
            if not findings:
                print(f"[INFO] No findings found for deleted bucket: {bucket_name}")
                return 0
                
            # 2. Prepare for archival
            logs_collection = self.db['s3_audit_logs'] # type: ignore
            archived_count = 0
            
            current_time = datetime.now(timezone.utc)
            
            for finding in findings:
                # Add deletion metadata
                finding['status'] = 'DELETED'
                finding['deleted_at'] = current_time
                if '_id' in finding:
                    finding['original_finding_id'] = finding.pop('_id') # Move _id to preserve it
                
                # Insert into logs
                logs_collection.insert_one(finding)
                archived_count += 1
                
            print(f"[INFO] Archived {archived_count} findings for deleted bucket: {bucket_name}")
            
            # 3. Delete from main collection
            self.delete_findings_by_bucket(bucket_name)
            
            return archived_count
            
        except Exception as e:
            print(f"[ERROR] Failed to handle bucket deletion in MongoDB: {str(e)}")
            import traceback
            print(f"[ERROR] Traceback: {traceback.format_exc()}")
            return -1

    def close_connection(self):
        """
        Close MongoDB connection
        """
        try:
            if self.client is not None:
                self.client.close() # type: ignore
                print("[INFO] MongoDB connection closed")
        except Exception as e:
            print(f"[ERROR] Error closing MongoDB connection: {str(e)}")

# Convenience function for Lambda usage
def store_finding_to_mongodb(finding_data, bucket_name=None):
    """
    Convenience function to store a finding in MongoDB
    
    Args:
        finding_data: The finding data to store
        bucket_name: Optional bucket name
        
    Returns:
        str: Document ID if successful, None if failed
    """
    try:
        print("[INFO] Initializing MongoDB client...")
        mongo_client = MongoDBClient()
        
        print("[INFO] Attempting to connect to MongoDB...")
        if mongo_client.connect():
            print("[INFO] MongoDB connection successful, storing finding...")
            document_id = mongo_client.store_finding(finding_data, bucket_name)
            mongo_client.close_connection()
            return document_id
        else:
            print("[ERROR] Failed to connect to MongoDB for storing finding")
            return None
    except Exception as e:
        print(f"[ERROR] Exception in store_finding_to_mongodb: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return None

def delete_findings_from_mongodb(bucket_name):
    """
    Convenience function to delete findings from MongoDB
    
    Args:
        bucket_name: Name of the S3 bucket
        
    Returns:
        int: Number of deleted documents, or -1 if failed
    """
    try:
        print(f"[INFO] Initializing MongoDB client to delete findings for {bucket_name}...")
        mongo_client = MongoDBClient()
        
        if mongo_client.connect():
            print(f"[INFO] MongoDB connection successful, deleting findings...")
            deleted_count = mongo_client.delete_findings_by_bucket(bucket_name)
            mongo_client.close_connection()
            return deleted_count
        else:
            print("[ERROR] Failed to connect to MongoDB for deleting findings")
            return -1
    except Exception as e:
        print(f"[ERROR] Exception in delete_findings_from_mongodb: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return -1

def handle_bucket_deletion_mongodb(bucket_name):
    """
    Convenience function to handle bucket deletion (archive + delete)
    
    Args:
        bucket_name: Name of the S3 bucket
        
    Returns:
        int: Number of archived documents, or -1 if failed
    """
    try:
        print(f"[INFO] Initializing MongoDB client to handle deletion for {bucket_name}...")
        mongo_client = MongoDBClient()
        
        if mongo_client.connect():
            print(f"[INFO] MongoDB connection successful, archiving findings...")
            archived_count = mongo_client.handle_bucket_deletion(bucket_name)
            mongo_client.close_connection()
            return archived_count
        else:
            print("[ERROR] Failed to connect to MongoDB for handling deletion")
            return -1
    except Exception as e:
        print(f"[ERROR] Exception in handle_bucket_deletion_mongodb: {str(e)}")
        import traceback
        print(f"[ERROR] Traceback: {traceback.format_exc()}")
        return -1