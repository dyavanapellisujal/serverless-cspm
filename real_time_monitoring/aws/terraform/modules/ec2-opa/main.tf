data "aws_ami" "amazon_linux_2" {
  most_recent = true

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  owners = ["137112412989"] # Official Amazon Linux AMI owner ID
}

resource "aws_key_pair" "opa_server_key_pair" {
    key_name = "opa_server_key_pair"
    public_key = file("${path.module}/key_pair/opa_server_key.pub")

  
}

resource "aws_security_group" "allow_opa_port" {
    name = "allow_opa_port"
    tags = {
      "Type" = "Sg-to-allow-opa-port"
    }
  
}
resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
  security_group_id = aws_security_group.allow_opa_port.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1" # semantically equivalent to all ports
}

resource "aws_vpc_security_group_ingress_rule" "allow_ports" {
    security_group_id = aws_security_group.allow_opa_port.id
    cidr_ipv4 = "0.0.0.0/0"
    for_each = var.allowed_ports_opa_server
    from_port         = tonumber(each.value)
    ip_protocol       = "tcp"
    to_port           = tonumber(each.value)
    
}

resource "aws_instance" "opa_server" {
    instance_type = "t2.micro"
    ami = data.aws_ami.amazon_linux_2.id
    associate_public_ip_address = true
    key_name = "opa_server_key_pair"
    vpc_security_group_ids = [ aws_security_group.allow_opa_port.id ]
    iam_instance_profile = var.iam_instance_profile
    #attach a role that is remaining
    user_data = <<EOF



    #!/bin/bash
    # Wait for network to be ready
    sleep 30
    sudo yum update -y
    
    # Download OPA (using 'latest' to ensure valid URL)
    sudo -u ec2-user curl -L -o /home/ec2-user/opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
    sudo -u ec2-user chmod 755 /home/ec2-user/opa
    
    cd /home/ec2-user
    # Ensure config directory exists
    sudo -u ec2-user mkdir -p /home/ec2-user/config_files
    
    # Copy config files
    sudo -u ec2-user aws s3 cp s3://${var.opa_conf_bucket_name}/config_files/ /home/ec2-user/config_files --recursive
    
    # Start OPA
    nohup sudo -u ec2-user ./opa run --server ./config_files --addr 0.0.0.0:8181 > /var/log/opa.log 2>&1 &
    
    



    EOF

    

    
}