$awsDir = "$env:USERPROFILE\.aws"
if (-not (Test-Path $awsDir)) {
    New-Item -ItemType Directory -Force -Path $awsDir | Out-Null
    Write-Host "Created .aws directory at $awsDir"
}

$accessKeyId = Read-Host "Enter AWS Access Key ID"
$secretAccessKey = Read-Host -AsSecureString "Enter AWS Secret Access Key"
$region = Read-Host "Enter Default Region (e.g. us-east-1)"

if ([string]::IsNullOrWhiteSpace($region)) {
    $region = "us-east-1"
}

$secretAccessKeyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretAccessKey))

$content = @"
[default]
aws_access_key_id = $accessKeyId
aws_secret_access_key = $secretAccessKeyPlain
region = $region
"@

Set-Content -Path "$awsDir\credentials" -Value $content -Encoding ASCII
Write-Host "Credentials saved to $awsDir\credentials"
Write-Host "You can now run 'terraform plan'"
