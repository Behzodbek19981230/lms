#!/bin/bash

# Build Verification Script
# Bu script build jarayonini tekshiradi va muammolarni aniqlaydi

set -e

echo "🔍 Frontend Build Verification"
echo "=============================="

FRONTEND_DIR="frontend"
DIST_DIR="$FRONTEND_DIR/dist"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to check if file exists
check_file() {
    local file_path="$1"
    local description="$2"
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ $description: $file_path${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: $file_path (NOT FOUND)${NC}"
        return 1
    fi
}

# Function to check directory
check_directory() {
    local dir_path="$1"
    local description="$2"
    
    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✅ $description: $dir_path${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: $dir_path (NOT FOUND)${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📁 Checking project structure...${NC}"

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Check package.json
check_file "$FRONTEND_DIR/package.json" "Package.json"

# Check vite.config.ts
check_file "$FRONTEND_DIR/vite.config.ts" "Vite config"

# Check if dist directory exists
if [ ! -d "$DIST_DIR" ]; then
    echo -e "${YELLOW}⚠️  Dist directory not found. Building...${NC}"
    cd "$FRONTEND_DIR"
    npm run build:prod
    cd ..
fi

echo -e "${YELLOW}🔍 Checking build output...${NC}"

# Check essential files
check_file "$DIST_DIR/index.html" "Main HTML file"
check_directory "$DIST_DIR/assets" "Assets directory"

# Check for JavaScript files
js_files=$(find "$DIST_DIR/assets" -name "*.js" 2>/dev/null | wc -l)
if [ "$js_files" -gt 0 ]; then
    echo -e "${GREEN}✅ JavaScript files: $js_files files found${NC}"
else
    echo -e "${RED}❌ No JavaScript files found in assets${NC}"
fi

# Check for CSS files
css_files=$(find "$DIST_DIR/assets" -name "*.css" 2>/dev/null | wc -l)
if [ "$css_files" -gt 0 ]; then
    echo -e "${GREEN}✅ CSS files: $css_files files found${NC}"
else
    echo -e "${RED}❌ No CSS files found in assets${NC}"
fi

# Check index.html content
if [ -f "$DIST_DIR/index.html" ]; then
    echo -e "${YELLOW}📄 Checking index.html content...${NC}"
    
    # Check if it contains React app
    if grep -q "root" "$DIST_DIR/index.html"; then
        echo -e "${GREEN}✅ React root element found${NC}"
    else
        echo -e "${RED}❌ React root element not found${NC}"
    fi
    
    # Check for script tags
    script_count=$(grep -c "<script" "$DIST_DIR/index.html" || echo "0")
    if [ "$script_count" -gt 0 ]; then
        echo -e "${GREEN}✅ Script tags: $script_count found${NC}"
    else
        echo -e "${RED}❌ No script tags found${NC}"
    fi
    
    # Check for CSS links
    css_count=$(grep -c "<link.*css" "$DIST_DIR/index.html" || echo "0")
    if [ "$css_count" -gt 0 ]; then
        echo -e "${GREEN}✅ CSS links: $css_count found${NC}"
    else
        echo -e "${RED}❌ No CSS links found${NC}"
    fi
fi

# Check file sizes
echo -e "${YELLOW}📊 Checking file sizes...${NC}"
total_size=$(du -sh "$DIST_DIR" | cut -f1)
echo -e "${GREEN}📦 Total build size: $total_size${NC}"

# Check for common issues
echo -e "${YELLOW}🔍 Checking for common issues...${NC}"

# Check if index.html is empty
if [ -f "$DIST_DIR/index.html" ]; then
    file_size=$(stat -f%z "$DIST_DIR/index.html" 2>/dev/null || stat -c%s "$DIST_DIR/index.html" 2>/dev/null || echo "0")
    if [ "$file_size" -lt 100 ]; then
        echo -e "${RED}❌ index.html is too small ($file_size bytes)${NC}"
    else
        echo -e "${GREEN}✅ index.html size is normal ($file_size bytes)${NC}"
    fi
fi

# Check for broken links in HTML
if [ -f "$DIST_DIR/index.html" ]; then
    echo -e "${YELLOW}🔗 Checking for broken asset links...${NC}"
    
    # Extract asset links and check if files exist
    while IFS= read -r line; do
        if [[ $line =~ src=\"([^\"]+)\" ]] || [[ $line =~ href=\"([^\"]+)\" ]]; then
            asset_path="$DIST_DIR/${BASH_REMATCH[1]}"
            if [ ! -f "$asset_path" ]; then
                echo -e "${RED}❌ Broken link: ${BASH_REMATCH[1]}${NC}"
            fi
        fi
    done < "$DIST_DIR/index.html"
fi

echo -e "${YELLOW}🎯 Build verification completed!${NC}"

# Summary
echo ""
echo "📋 Summary:"
echo "- Build directory: $DIST_DIR"
echo "- Total files: $(find "$DIST_DIR" -type f | wc -l)"
echo "- Total size: $total_size"
echo "- Main HTML: $(check_file "$DIST_DIR/index.html" "index.html" >/dev/null && echo "✅ OK" || echo "❌ MISSING")"
echo "- Assets: $(check_directory "$DIST_DIR/assets" "assets" >/dev/null && echo "✅ OK" || echo "❌ MISSING")"
