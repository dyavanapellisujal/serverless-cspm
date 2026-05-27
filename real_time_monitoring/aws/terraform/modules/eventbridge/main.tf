# EventBridge Rule for S3 Bucket Creation
resource "aws_cloudwatch_event_rule" "s3_bucket_creation" {
  name        = "cspm-s3-bucket-creation-rule"
  description = "Trigger when S3 bucket is created"

  event_pattern = jsonencode({
    source      = ["aws.s3", "aws.ec2"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventSource = ["s3.amazonaws.com", "ec2.amazonaws.com"]
      eventName   = [
        "CreateBucket",
        "PutBucketAcl",
        "PutBucketPolicy",
        "PutBucketEncryption",
        "PutBucketVersioning",
        "PutBucketPublicAccessBlock",
        "DeleteBucketPublicAccessBlock",
        "DeleteBucketPolicy",
        "DeleteBucket",
        "AuthorizeSecurityGroupIngress",
        "RevokeSecurityGroupIngress",
        "DeleteSecurityGroup"
      ]
    }
  })

  tags = var.tags
}

# SQS Queue for S3 audit events
resource "aws_sqs_queue" "s3_audit_queue" {
  name                      = "cspm-s3-audit-events"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 1209600  # 14 days
  receive_wait_time_seconds = 0
  visibility_timeout_seconds = 300     # 5 minutes

  tags = var.tags
}

# SQS Queue Policy to allow EventBridge to send messages
resource "aws_sqs_queue_policy" "s3_audit_queue_policy" {
  queue_url = aws_sqs_queue.s3_audit_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowEventBridgeToSendMessage"
        Effect = "Allow"
        Principal = {
          Service = "events.amazonaws.com"
        }
        Action   = "sqs:SendMessage"
        Resource = aws_sqs_queue.s3_audit_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_cloudwatch_event_rule.s3_bucket_creation.arn
          }
        }
      }
    ]
  })
}

# EventBridge Target - SQS Queue
resource "aws_cloudwatch_event_target" "s3_sqs_target" {
  rule      = aws_cloudwatch_event_rule.s3_bucket_creation.name
  target_id = "S3AuditorSQSTarget"
  arn       = aws_sqs_queue.s3_audit_queue.arn

  # Send the full CloudTrail event to SQS
  # The Lambda function will process the raw event
}

# CloudTrail for S3 API calls (if not already exists)
resource "aws_cloudtrail" "s3_api_trail" {
  name           = "cspm-s3-api-trail"
  s3_bucket_name = aws_s3_bucket.cloudtrail_bucket.bucket

  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
  }

  depends_on = [aws_s3_bucket_policy.cloudtrail_bucket_policy]
  tags       = var.tags
}

# S3 Bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail_bucket" {
  bucket        = "cspm-cloudtrail-logs-${random_string.bucket_suffix.result}"
  force_destroy = true
  tags          = var.tags
}

# Random string for unique bucket naming
resource "random_string" "bucket_suffix" {
  length  = 8
  special = false
  upper   = false
}

# S3 Bucket Policy for CloudTrail
resource "aws_s3_bucket_policy" "cloudtrail_bucket_policy" {
  bucket = aws_s3_bucket.cloudtrail_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSCloudTrailAclCheck"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.cloudtrail_bucket.arn
      },
      {
        Sid    = "AWSCloudTrailWrite"
        Effect = "Allow"
        Principal = {
          Service = "cloudtrail.amazonaws.com"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.cloudtrail_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl" = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "cloudtrail_bucket_pab" {
  bucket = aws_s3_bucket.cloudtrail_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}