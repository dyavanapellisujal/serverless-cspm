variable "kms_lambda_zip_path" {
  description = "Path to the KMS Lambda deployment zip file"
  type        = string
  default     = "../lambda_deployment/kms_lambda.zip"
}

variable "s3_lambda_zip_path" {
  description = "Path to the S3 Lambda deployment zip file"
  type        = string
  default     = "../lambda_deployment/s3_lambda.zip"
}

variable "runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "python3.12"
}

variable "opa_server_ip" {
  description = "IP address of the OPA server"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "api_stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "v1"
}

variable "account_id" {
  description = "AWS Account ID"
  type        = string
}

variable "region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mongodb_database" {
  description = "MongoDB database name"
  type        = string
  default     = "cspm_findings"
}

variable "mongodb_collection_kms" {
  description = "MongoDB collection name for KMS findings"
  type        = string
  default     = "kms_security_findings"
}

variable "mongodb_collection_s3" {
  description = "MongoDB collection name for S3 findings"
  type        = string
  default     = "s3_security_findings"
}

variable "sqs_queue_arn" {
  description = "ARN of the SQS queue for S3 audit events"
  type        = string
}