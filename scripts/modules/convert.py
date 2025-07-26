#!/usr/bin/python3

import re
import sys

if len(sys.argv) < 2:
    print("Usage: python convert.py <filename>")
    sys.exit(1)

file_path = sys.argv[1]
print(f"Filename provided: {file_path}")

# Define the number of spaces to replace with a tab
spaces_to_replace = 4  # Adjust based on your file's indentation

# Regular expression to match leading spaces
pattern = f"^({' ' * spaces_to_replace})"

# Read and modify the file
with open(file_path, "r") as file:
    lines = file.readlines()

with open(file_path, "w") as file:
    for line in lines:
        # Replace leading spaces with tabs
        modified_line = re.sub(pattern, "\t", line)
        file.write(modified_line)

print(f"Replaced leading {spaces_to_replace} spaces with tabs in {file_path}.")