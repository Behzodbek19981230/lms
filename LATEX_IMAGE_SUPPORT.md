# LaTeX and Base64 Image Support in PDF Generation

## Features Added

### 1. LaTeX Formula Support ✅
The system now supports LaTeX formulas in both questions and answers:

#### Inline Math (with single $)
```
Ushbu tenglamani yeching: $x^2 + 5x + 6 = 0$
```

#### Display Math (with double $$)
```
$$\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
```

#### Common LaTeX Symbols Supported:
- Greek letters: `\alpha`, `\beta`, `\gamma`, `\delta`, `\pi`, `\theta`, `\lambda`, `\mu`, `\sigma`, `\omega`
- Math operators: `\sum`, `\int`, `\infty`, `\pm`, `\times`, `\div`, `\leq`, `\geq`, `\neq`, `\approx`
- Fractions: `\frac{numerator}{denominator}`
- Square roots: `\sqrt{expression}`
- Superscripts: `x^2`
- Subscripts: `x_1`

### 2. Base64 Image Support ✅
The system automatically detects and processes Base64 images in questions and answers:

#### Supported Image Formats:
- PNG: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...`
- JPEG: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...`
- GIF: `data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP//...`

#### Size Limits:
- Question images: Max 1MB
- Answer images: Max 512KB

### 3. PDF Layout Improvements ✅
- **Smart spacing**: Automatically calculates space needed for LaTeX formulas and images
- **2-column layout**: Maintains professional formatting even with complex content
- **Image placement**: Optimally positioned within column constraints
- **Fallback handling**: Shows "[Rasm]" placeholder if image processing fails

## Usage Examples

### Example Question with LaTeX:
```json
{
  "text": "Ushbu kvadrat tenglamaning ildizlarini toping: $ax^2 + bx + c = 0$. Formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
  "answers": [
    {
      "text": "$x = \\frac{-b + \\sqrt{\\Delta}}{2a}$ va $x = \\frac{-b - \\sqrt{\\Delta}}{2a}$",
      "isCorrect": true
    }
  ]
}
```

### Example Question with Image:
```json
{
  "text": "Quyidagi diagrammani tahlil qiling: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... Nima xulosaga kelasiz?",
  "answers": [
    {
      "text": "Ma'lumotlar ortib bormoqda",
      "isCorrect": true
    }
  ]
}
```

## Technical Implementation

### Backend Services:
1. **LatexProcessorService**: Handles LaTeX formula conversion and image processing
2. **TestGeneratorService**: Enhanced with LaTeX and image support
3. **PDF Generation**: Uses PDFKit with custom image embedding

### Processing Flow:
1. **Content Analysis**: Detects LaTeX formulas (`$...$` and `$$...$$`) and Base64 images
2. **LaTeX Conversion**: Converts LaTeX to Unicode symbols for PDF display
3. **Image Extraction**: Processes Base64 data and embeds images in PDF
4. **Layout Calculation**: Adjusts spacing for mathematical content and images
5. **PDF Generation**: Creates professional 2-column layout with all content

## Error Handling:
- LaTeX rendering failures: Falls back to original text
- Image processing errors: Shows "[Rasm]" placeholder
- Large images: Automatically resized to fit column constraints
- Invalid Base64: Gracefully ignored with warning logs

This implementation provides comprehensive support for mathematical content and visual elements in educational assessments while maintaining the professional PDF layout and performance.
