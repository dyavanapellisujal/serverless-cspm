
import os
import shutil
import subprocess
import sys

def build_lambda():
    root_dir = r"d:\Projects\CSPM\serverless-cspm\real_time_monitoring\aws"
    lambda_dir = os.path.join(root_dir, "lambda_deployment")
    s3_source = os.path.join(lambda_dir, "s3_lambda")
    build_dir = os.path.join(lambda_dir, "build_s3")
    zip_file = os.path.join(lambda_dir, "s3_lambda.zip")
    requirements_file = os.path.join(s3_source, "requirements.txt")

    print(f"Building S3 Lambda...")
    print(f"Root: {root_dir}")
    print(f"Source: {s3_source}")
    print(f"Build Dir: {build_dir}")

    # 1. Clean Build Directory
    if os.path.exists(build_dir):
        print("Cleaning build directory...")
        shutil.rmtree(build_dir)
    os.makedirs(build_dir, exist_ok=True)

    # 2. Install Dependencies
    if os.path.exists(requirements_file):
        print("Installing dependencies...")
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", 
                "-r", requirements_file, 
                "-t", build_dir, 
                "--upgrade",
                "--no-cache-dir" # Verify if this helps speed/stability
            ])
        except subprocess.CalledProcessError as e:
            print(f"Error installing dependencies: {e}")
            return False
    else:
        print("No requirements.txt found.")

    # 3. Copy Source Code
    print("Copying source code...")
    try:
        # Copy .py files
        for item in os.listdir(s3_source):
            if item.endswith(".py"):
                src = os.path.join(s3_source, item)
                dst = os.path.join(build_dir, item)
                shutil.copy2(src, dst)
        
        # Copy helper_functions
        helper_src = os.path.join(s3_source, "helper_functions")
        if os.path.exists(helper_src):
            helper_dst = os.path.join(build_dir, "helper_functions")
            shutil.copytree(helper_src, helper_dst, dirs_exist_ok=True)
            print("Copied helper_functions.")
    except Exception as e:
        print(f"Error copying files: {e}")
        return False

    # 4. Remove cached files (optional, but good practice)
    print("Removing cached files...")
    for root, dirs, files in os.walk(build_dir):
        for d in dirs:
            if d == "__pycache__":
                shutil.rmtree(os.path.join(root, d))
        for f in files:
            if f.endswith(".pyc"):
                os.remove(os.path.join(root, f))

    # 5. Create Zip
    print(f"Zipping to {zip_file}...")
    if os.path.exists(zip_file):
        os.remove(zip_file)
    
    try:
        shutil.make_archive(zip_file.replace('.zip', ''), 'zip', build_dir)
        print("Zip created successfully.")
    except Exception as e:
        print(f"Error creating zip: {e}")
        return False

    print("Build Complete!")
    return True

if __name__ == "__main__":
    success = build_lambda()
    if not success:
        sys.exit(1)
