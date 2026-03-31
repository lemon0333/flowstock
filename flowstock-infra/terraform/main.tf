terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 나중에 S3 백엔드로 교체 가능
  backend "local" {}
}

provider "aws" {
  region = var.aws_region
}

# CloudFront는 무조건 us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
