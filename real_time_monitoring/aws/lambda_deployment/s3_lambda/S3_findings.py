import boto3 # type: ignore
import requests # type: ignore
from BucketACLS import audit_bucket_security, audit_bucket_acl # type: ignore
from mongodb_client import store_finding_to_mongodb, delete_findings_from_mongodb, handle_bucket_deletion_mongodb # type: ignore
import json
import os
from datetime import datetime, timezone
import hashlib

s3 = boto3.client('s3')

def calculate_md5(string):
    return hashlib.md5(string.encode()).hexdigest()

def process_ec2_security_group_event(detail, region, account_id):
    try:
        request_params = detail.get('requestParameters', {})
        group_id = request_params.get('groupId', 'unknown-sg')
        
        is_vulnerable = False
        items = request_params.get('ipPermissions', {}).get('items', [])
        for item in items:
            from_port = item.get('fromPort', 0)
            to_port = item.get('toPort', 0)
            ip_ranges = item.get('ipRanges', {}).get('items', [])
            
            has_open_ip = any(ip.get('cidrIp') == '0.0.0.0/0' for ip in ip_ranges)
            
            if has_open_ip and from_port <= 22 and to_port >= 22:
                is_vulnerable = True
                break
                
        if is_vulnerable:
            finding_id_source = f"{account_id}{region}{group_id}EC2OpenSSH"
            finding_timestamp = datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')
            
            finding = {
                "Findings": [{
                    "Id": f"arn:aws:ec2:{region}:{account_id}:security-group/{group_id}",
                    "AwsAccountId": account_id,
                    "Title": "EC2 Security Group Permits Unrestricted SSH Access",
                    "Description": f"Security Group {group_id} has an inbound rule allowing SSH (port 22) from 0.0.0.0/0.",
                    "Severity": {"Label": "CRITICAL", "Normalized": 90},
                    "Types": ["Software and Configuration Checks/AWS Security Best Practices"],
                    "CreatedAt": finding_timestamp,
                    "UpdatedAt": finding_timestamp,
                    "Resources": [{
                        "Type": "AwsEc2SecurityGroup",
                        "Id": f"arn:aws:ec2:{region}:{account_id}:security-group/{group_id}",
                        "Partition": "aws",
                        "Region": region
                    }],
                    "Compliance": {"Status": "FAILED"},
                    "RecordState": "ACTIVE",
                    "WorkflowState": "NEW",
                    "UserDefinedFields": {"FindingId": calculate_md5(finding_id_source)}
                }]
            }
            store_finding_to_mongodb(finding, bucket_name=group_id)
            print(f"Stored EC2 finding for {group_id}")
    except Exception as e:
        print(f"Error processing EC2 event: {e}")

def lambda_handler(event, context):
    try:
        print(f"Processing event: {json.dumps(event)}")
        
        # Check for SQS Records (The Standard Pathway)
        if 'Records' in event:
            print("Processing SQS records...")
            for record in event['Records']:
                message_body = json.loads(record['body'])
                
                if 'detail' in message_body:
                    detail = message_body['detail']
                    event_source = detail.get('eventSource', '')
                    event_name = detail.get('eventName', '')
                    region = detail.get('awsRegion', 'us-east-1')
                    account_id = detail.get('userIdentity', {}).get('accountId', 'unknown-account')
                    
                    print(f"Event: {event_name} from {event_source}")
                    
                    # 1. Handle EC2 Events
                    if event_source == 'ec2.amazonaws.com':
                        if event_name == 'AuthorizeSecurityGroupIngress':
                            process_ec2_security_group_event(detail, region, account_id)
                        elif event_name in ['RevokeSecurityGroupIngress', 'DeleteSecurityGroup']:
                            group_id = detail.get('requestParameters', {}).get('groupId')
                            if group_id:
                                handle_bucket_deletion_mongodb(group_id)
                    
                    # 2. Handle S3 Events
                    elif event_source == 's3.amazonaws.com':
                        bucket_name = detail.get('requestParameters', {}).get('bucketName') or \
                                      detail.get('requestParameters', {}).get('BucketName')
                        
                        if bucket_name:
                            print(f"S3 event for bucket: {bucket_name}")
                            if event_name == 'DeleteBucket':
                                handle_bucket_deletion_mongodb(bucket_name)
                            else:
                                process_bucket_audit(bucket_name, region, account_id)
        
        # Fallback for direct invocations (Testing)
        else:
            bucket_name = event.get('bucket_name')
            region = event.get('region', 'us-east-1')
            account_id = event.get('account_id', 'unknown-account')
            if bucket_name:
                return process_bucket_audit(bucket_name, region, account_id)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Processed successfully'})
        }

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

def process_bucket_audit(bucket_name, region, account_id):
    try:
        if not bucket_name:
            return {'error': 'bucket_name is required'}
        
        # Try to get tags for tagging-based OPA rules
        try:
            s3_client = boto3.client('s3', region_name=region)
            tagset = s3_client.get_bucket_tagging(Bucket=bucket_name).get('TagSet', [])
        except Exception:
            tagset = []
            
        print(f"Auditing bucket: {bucket_name}")
        audit_result = audit_bucket_security(bucket_name=bucket_name, account_id=account_id, region=region, tagset=tagset)

        if audit_result:
            store_finding_to_mongodb(audit_result, bucket_name)
            
        return {'status': 'completed', 'bucket': bucket_name}
    except Exception as e:
        print(f"Error in process_bucket_audit: {str(e)}")
        return {'error': str(e)}

if __name__ == "__main__":
    pass
