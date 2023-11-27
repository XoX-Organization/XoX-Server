#!/bin/bash

version=$(python3 --version | cut -d " " -f 2)

if [[ $(echo "$version 3.10" | awk '{print ($1 < $2)}') == "1" ]];
then
    echo "Error: Python version must be 3.10 or higher"
    exit 1
else
    python3 -u ./run.py
fi
