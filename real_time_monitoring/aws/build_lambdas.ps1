$ErrorActionPreference = "Stop"

$root = "d:\Projects\CSPM\serverless-cspm\real_time_monitoring\aws"
$lambdaDir = "$root\lambda_deployment"
$s3Source = "$lambdaDir\s3_lambda"
$buildDir = "$lambdaDir\build_s3"
$zipFile = "$lambdaDir\s3_lambda.zip"

Write-Host "Building S3 Lambda..."

# 1. Clean Build Directory
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

# 2. Install Dependencies
Write-Host "Installing dependencies..."
pip install -r "$s3Source\requirements.txt" -t $buildDir --upgrade

# 3. Copy Source Code
Write-Host "Copying source code..."
Copy-Item "$s3Source\*.py" -Destination $buildDir
if (Test-Path "$s3Source\helper_functions") {
    Copy-Item -Recurse "$s3Source\helper_functions" -Destination $buildDir
}

# 4. Remove cached files
Get-ChildItem -Path $buildDir -Include "__pycache__", "*.pyc" -Recurse | Remove-Item -Force

# 5. Create Zip
Write-Host "Zipping to $zipFile..."
if (Test-Path $zipFile) { Remove-Item -Force $zipFile }
Compress-Archive -Path "$buildDir\*" -DestinationPath $zipFile -Force

Write-Host "Build Complete! Now run 'terraform apply'."
