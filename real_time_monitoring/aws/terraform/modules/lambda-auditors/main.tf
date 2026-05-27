# KMS Auditor Lambda Function
resource "aws_lambda_function" "kms_auditor_lambda" {
  function_name = "cspm-kms-auditor"
  role         = aws_iam_role.kms_lambda_role.arn
  handler      = "lambda_handler.lambda_handler"
  runtime      = var.runtime
  timeout      = 300
  memory_size  = 512

  filename         = var.kms_lambda_zip_path
  source_code_hash = filebase64sha256(var.kms_lambda_zip_path)

  environment {
    variables = {
      OPA_SERVER_IP        = var.opa_server_ip
      LOG_LEVEL           = "INFO"
      MONGODB_URI         = var.mongodb_uri
      MONGODB_DATABASE    = var.mongodb_database
      MONGODB_COLLECTION  = var.mongodb_collection_kms
    }
  }

  tags = {
    Name        = "CSPM-KMS-Auditor"
    Environment = var.environment
    Purpose     = "KMS-Security-Audit"
  }
}

# S3 Auditor Lambda Function
resource "aws_lambda_function" "s3_auditor_lambda" {
  function_name = "cspm-s3-auditor"
  role         = aws_iam_role.s3_lambda_role.arn
  handler      = "lambda_handler.lambda_handler"
  runtime      = var.runtime
  timeout      = 300
  memory_size  = 1024

  filename         = var.s3_lambda_zip_path
  source_code_hash = filebase64sha256(var.s3_lambda_zip_path)

  environment {
    variables = {
      OPA_SERVER_IP           = var.opa_server_ip
      KMS_LAMBDA_FUNCTION_NAME = aws_lambda_function.kms_auditor_lambda.function_name
      KMS_API_GATEWAY_URL     = aws_api_gateway_stage.kms_api_stage.invoke_url
      LOG_LEVEL               = "INFO"
      MONGODB_URI             = var.mongodb_uri
      MONGODB_DATABASE        = var.mongodb_database
      MONGODB_COLLECTION      = var.mongodb_collection_s3
    }
  }

  depends_on = [aws_lambda_function.kms_auditor_lambda]

  tags = {
    Name        = "CSPM-S3-Auditor"
    Environment = var.environment
    Purpose     = "S3-Security-Audit"
  }
}

# IAM Role for KMS Lambda
resource "aws_iam_role" "kms_lambda_role" {
  name = "cspm-kms-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "CSPM-KMS-Lambda-Role"
    Environment = var.environment
  }
}

# IAM Role for S3 Lambda
resource "aws_iam_role" "s3_lambda_role" {
  name = "cspm-s3-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "CSPM-S3-Lambda-Role"
    Environment = var.environment
  }
}

# IAM Policy for KMS Lambda
resource "aws_iam_role_policy" "kms_lambda_policy" {
  name = "cspm-kms-lambda-policy"
  role = aws_iam_role.kms_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Describe*",
          "kms:Get*",
          "kms:List*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for S3 Lambda
resource "aws_iam_role_policy" "s3_lambda_policy" {
  name = "cspm-s3-lambda-policy"
  role = aws_iam_role.s3_lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucket*",
          "s3:GetObject*",
          "s3:ListBucket*",
          "s3:GetEncryptionConfiguration"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = aws_lambda_function.kms_auditor_lambda.arn
      },
      {
        Effect = "Allow"
        Action = [
          "securityhub:BatchImportFindings"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:Get*",
          "iam:List*",
          "ec2:Describe*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      }
    ]
  })
}

# API Gateway for KMS Lambda
resource "aws_api_gateway_rest_api" "kms_api" {
  name        = "cspm-kms-api"
  description = "API Gateway for CSPM KMS Auditor Lambda"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "CSPM-KMS-API"
    Environment = var.environment
  }
}

# API Gateway Resource - Health Check
resource "aws_api_gateway_resource" "kms_health" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  parent_id   = aws_api_gateway_rest_api.kms_api.root_resource_id
  path_part   = "health"
}

# API Gateway Resource - Audit Key
resource "aws_api_gateway_resource" "kms_audit_key" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  parent_id   = aws_api_gateway_rest_api.kms_api.root_resource_id
  path_part   = "audit-key"
}

# API Gateway Resource - Key Info
resource "aws_api_gateway_resource" "kms_key_info" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  parent_id   = aws_api_gateway_rest_api.kms_api.root_resource_id
  path_part   = "key-info"
}

# API Gateway Method - Health Check
resource "aws_api_gateway_method" "kms_health_post" {
  rest_api_id   = aws_api_gateway_rest_api.kms_api.id
  resource_id   = aws_api_gateway_resource.kms_health.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Method - Audit Key
resource "aws_api_gateway_method" "kms_audit_key_post" {
  rest_api_id   = aws_api_gateway_rest_api.kms_api.id
  resource_id   = aws_api_gateway_resource.kms_audit_key.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Method - Key Info
resource "aws_api_gateway_method" "kms_key_info_post" {
  rest_api_id   = aws_api_gateway_rest_api.kms_api.id
  resource_id   = aws_api_gateway_resource.kms_key_info.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Integration - Health Check
resource "aws_api_gateway_integration" "kms_health_integration" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  resource_id = aws_api_gateway_resource.kms_health.id
  http_method = aws_api_gateway_method.kms_health_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.kms_auditor_lambda.invoke_arn
}

# API Gateway Integration - Audit Key
resource "aws_api_gateway_integration" "kms_audit_key_integration" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  resource_id = aws_api_gateway_resource.kms_audit_key.id
  http_method = aws_api_gateway_method.kms_audit_key_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.kms_auditor_lambda.invoke_arn
}

# API Gateway Integration - Key Info
resource "aws_api_gateway_integration" "kms_key_info_integration" {
  rest_api_id = aws_api_gateway_rest_api.kms_api.id
  resource_id = aws_api_gateway_resource.kms_key_info.id
  http_method = aws_api_gateway_method.kms_key_info_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.kms_auditor_lambda.invoke_arn
}

# Lambda Permission for API Gateway - Health
resource "aws_lambda_permission" "kms_api_health_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayHealth"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.kms_auditor_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.kms_api.execution_arn}/*/*"
}

# Lambda Permission for API Gateway - Audit Key
resource "aws_lambda_permission" "kms_api_audit_permission" {
  statement_id  = "AllowExecutionFromAPIGatewayAudit"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.kms_auditor_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.kms_api.execution_arn}/*/*"
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "kms_api_deployment" {
  depends_on = [
    aws_api_gateway_integration.kms_health_integration,
    aws_api_gateway_integration.kms_audit_key_integration,
    aws_api_gateway_integration.kms_key_info_integration
  ]

  rest_api_id = aws_api_gateway_rest_api.kms_api.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "kms_api_stage" {
  deployment_id = aws_api_gateway_deployment.kms_api_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.kms_api.id
  stage_name    = var.api_stage_name

  tags = {
    Name        = "CSPM-KMS-API-Stage"
    Environment = var.environment
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "kms_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.kms_auditor_lambda.function_name}"
  retention_in_days = 14

  tags = {
    Name        = "CSPM-KMS-Lambda-Logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "s3_lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.s3_auditor_lambda.function_name}"
  retention_in_days = 14

  tags = {
    Name        = "CSPM-S3-Lambda-Logs"
    Environment = var.environment
  }
}

# SQS Event Source Mapping for S3 Lambda
resource "aws_lambda_event_source_mapping" "s3_sqs_trigger" {
  event_source_arn = var.sqs_queue_arn
  function_name    = aws_lambda_function.s3_auditor_lambda.arn
  batch_size       = 1
  enabled          = true

  # Configure error handling
  maximum_batching_window_in_seconds = 0
  
  tags = {
    Name        = "CSPM-S3-SQS-Trigger"
    Environment = var.environment
  }
}