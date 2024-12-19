#!/bin/bash

# Run the Vite build directly
npx vite build

# Ensure we're in the right directory
cd src

# Move the dist directory up one level if it exists in src
if [ -d "dist" ]; then
    mv dist ../dist
fi 