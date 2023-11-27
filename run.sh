#!/bin/bash

if command -v python3.10 &> /dev/null; then
    version=$(python3.10 --version | cut -d " " -f 2)
    python_cmd="python3.10"
else
    version=$(python3 --version | cut -d " " -f 2)
    python_cmd="python3"
fi

if [[ $(echo -e "$version\n3.10" | sort -V | head -n1) != "3.10" ]]; then
    echo "Error: Python version must be 3.10 or higher"
    exit 1
else
    $python_cmd -u ./run.py
fi
