import os
import re
import subprocess
import tempfile
import hashlib
from pathlib import Path

def latex_to_svg(latex_content):
    # Create a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create LaTeX document
        latex_doc = r"""
\documentclass[preview]{standalone}
\usepackage{amsmath,amssymb}
\begin{document}
$%s$
\end{document}
""" % latex_content.strip('$')  # Remove any existing $ signs

        # Write LaTeX document to file
        tex_file = os.path.join(temp_dir, "equation.tex")
        with open(tex_file, "w") as f:
            f.write(latex_doc)

        # Run pdflatex
        subprocess.run(
            ["pdflatex", "-interaction=nonstopmode", "-output-directory", temp_dir, tex_file],
            capture_output=True,
            text=True
        )

        # Convert PDF to SVG using pdf2svg
        pdf_file = os.path.join(temp_dir, "equation.pdf")
        svg_file = os.path.join(temp_dir, "equation.svg")
        
        try:
            subprocess.run(
                ["pdf2svg", pdf_file, svg_file],
                check=True,
                capture_output=True,
                text=True
            )

            # Read the SVG content
            with open(svg_file, "r") as f:
                svg_content = f.read()
                
            return svg_content
        except subprocess.CalledProcessError as e:
            print(f"Error converting PDF to SVG: {e}")
            return None

def process_equations(text):
    # Create equations directory if it doesn't exist
    equations_dir = Path('flashcards/equations')
    equations_dir.mkdir(parents=True, exist_ok=True)
    
    # Process display equations
    display_pattern = r'\\\[(.*?)\\\]'
    for match in re.finditer(display_pattern, text, re.DOTALL):
        latex = match.group(1).strip()
        svg = latex_to_svg(latex)
        
        if svg:
            # Generate a unique filename based on content
            filename = hashlib.md5(latex.encode()).hexdigest() + '.svg'
            svg_path = equations_dir / filename
            
            # Save SVG file
            with open(svg_path, 'w') as f:
                f.write(svg)
            
            # Replace equation with img tag
            text = text.replace(match.group(0), f'<img src="equations/{filename}" class="display-equation" alt="equation">')
    
    # Process inline equations
    inline_pattern = r'\\\((.*?)\\\)'
    for match in re.finditer(inline_pattern, text, re.DOTALL):
        latex = match.group(1).strip()
        svg = latex_to_svg(latex)
        
        if svg:
            # Generate a unique filename based on content
            filename = hashlib.md5(latex.encode()).hexdigest() + '.svg'
            svg_path = equations_dir / filename
            
            # Save SVG file
            with open(svg_path, 'w') as f:
                f.write(svg)
            
            # Replace equation with img tag
            text = text.replace(match.group(0), f'<img src="equations/{filename}" class="inline-equation" alt="equation">')
    
    return text

def generate_flashcard_html(question, answer, filename):
    # Pre-render equations to SVG
    question = process_equations(question)
    answer = process_equations(answer)
    
    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flashcard</title>
    <link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMath()"></script>
    <script>
        function renderMath() {{
            renderMathInElement(document.body, {{
                delimiters: [
                    {{left: "\\\\[", right: "\\\\]", display: true}},
                    {{left: "\\\\(", right: "\\\\)", display: false}}
                ],
                throwOnError: false,
                trust: true,
                strict: false
            }});
        }}
    </script>
    <style>
        :root {{
            --bg-color: #ffffff;
            --card-bg: #f5f5f5;
            --text-color: #1a1a1a;
            --border-color: #e0e0e0;
            --button-bg: #e0e0e0;
            --hint-color: #666666;
        }}

        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg-color: #191919;
                --card-bg: #202020;
                --text-color: #ffffff;
                --border-color: #404040;
                --button-bg: #404040;
                --hint-color: #999999;
            }}
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Jost', -apple-system, BlinkMacSystemFont, sans-serif;
        }}

        body {{
            background-color: var(--bg-color);
            color: var(--text-color);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            transition: background-color 0.3s ease, color 0.3s ease;
        }}

        .container {{
            width: 100%;
            max-width: 800px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }}

        .flashcard-container {{
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 20px;
        }}

        .flashcard {{
            width: 100%;
            max-width: 400px;
            aspect-ratio: 1;
            perspective: 1500px;
            margin: 0 auto;
            position: relative;
            cursor: pointer;
            border-radius: 16px;
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
        }}

        .flashcard-inner {{
            position: relative;
            width: 100%;
            height: 100%;
            text-align: center;
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
            border-radius: 16px;
            will-change: transform;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }}

        .flashcard:hover .flashcard-inner {{
            transform: rotateY(180deg);
        }}

        .flashcard-front,
        .flashcard-back {{
            position: absolute;
            width: 100%;
            height: 100%;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            padding: 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: var(--card-bg);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            border-radius: 16px;
            overflow: hidden;
            transform-style: preserve-3d;
            -webkit-transform-style: preserve-3d;
        }}

        .flashcard-back {{
            transform: rotateY(180deg);
        }}

        .flashcard-content {{
            padding: 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100%;
            position: relative;
        }}

        .flashcard-content p {{
            font-size: 1.1rem;
            line-height: 1.5;
            margin: 0;
            color: var(--text-color);
            font-weight: 300;
        }}

        .hint {{
            font-size: 0.7rem;
            color: var(--hint-color);
            font-weight: 300;
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            opacity: 0.7;
            width: 100%;
            text-align: center;
        }}

        @supports (-webkit-appearance:none) {{
            .flashcard {{
                transform: translateZ(0);
            }}
            
            .flashcard-inner {{
                -webkit-transform-style: preserve-3d !important;
                transform-style: preserve-3d !important;
            }}
        }}
        
        .display-equation {{
            display: block;
            margin: 1em auto;
            max-width: 90%;
            height: auto;
        }}
        
        .inline-equation {{
            display: inline-block;
            vertical-align: middle;
            height: 1.2em;
            margin: 0 0.2em;
        }}

        /* Additional styles for KaTeX */
        .katex {{ 
            font-size: 1.1em !important;
        }}
        .katex-display {{ 
            margin: 1em 0 !important;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 0.5em 0;
        }}
        .katex-html {{
            max-width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="flashcard-container">
            <div class="flashcard">
                <div class="flashcard-inner">
                    <div class="flashcard-front">
                        <div class="flashcard-content">
                            <p id="question-text">{question}</p>
                            <div class="hint">Hover to flip</div>
                        </div>
                    </div>
                    <div class="flashcard-back">
                        <div class="flashcard-content">
                            <p id="answer-text">{answer}</p>
                            <div class="hint">Hover to flip</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script>
        // Re-render math when card is flipped
        document.querySelector('.flashcard').addEventListener('mouseenter', function() {{
            setTimeout(renderMath, 300);
        }});
    </script>
</body>
</html>'''

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html_content)

def parse_qa_file(file_path):
    qa_pairs = []
    current_question = None
    current_answer = None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('Q:'):
                if current_question and current_answer:
                    qa_pairs.append((current_question, current_answer))
                current_question = line[2:].strip()
                current_answer = None
            elif line.startswith('A:'):
                current_answer = line[2:].strip()
    
    if current_question and current_answer:
        qa_pairs.append((current_question, current_answer))
    
    return qa_pairs

def main():
    # Create flashcards directory if it doesn't exist
    if not os.path.exists('flashcards'):
        os.makedirs('flashcards')
    
    # Parse the Q&A file
    qa_pairs = parse_qa_file('.git/QnA.txt')
    
    # Generate HTML files for each Q&A pair
    for i, (question, answer) in enumerate(qa_pairs, 1):
        # Extract tag if present
        tag_match = re.search(r'<([^>]+)>', question)
        tag = tag_match.group(1) if tag_match else f'card_{i}'
        
        # Remove tag from question
        question = re.sub(r'<[^>]+>', '', question).strip()
        
        # Generate filename
        filename = f'flashcards/{tag}.html'
        
        # Generate HTML
        generate_flashcard_html(question, answer, filename)
        print(f'Generated flashcard: {filename}')

if __name__ == '__main__':
    main() 