import React, { useState, useRef, useEffect } from 'react';
import { Copy, Edit, Check, Download } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  language: string;
  filename?: string;
  onSave?: (code: string) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code: initialCode, 
  language, 
  filename = 'code',
  onSave 
}) => {
  const [code, setCode] = useState(initialCode);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(code);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCode(initialCode);
    setIsEditing(false);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'bash': 'sh',
      'shell': 'sh',
      'yaml': 'yml',
      'dockerfile': 'Dockerfile',
      'terraform': 'tf',
      'json': 'json',
      'xml': 'xml',
      'html': 'html',
      'css': 'css',
      'sql': 'sql',
      'go': 'go',
      'rust': 'rs',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'ruby': 'rb'
    };
    return extensions[lang.toLowerCase()] || 'txt';
  };

  const getLanguageName = (lang: string): string => {
    const names: { [key: string]: string } = {
      'javascript': 'JavaScript',
      'typescript': 'TypeScript',
      'python': 'Python',
      'bash': 'Bash',
      'shell': 'Shell',
      'yaml': 'YAML',
      'dockerfile': 'Dockerfile',
      'terraform': 'Terraform',
      'json': 'JSON',
      'xml': 'XML',
      'html': 'HTML',
      'css': 'CSS',
      'sql': 'SQL',
      'go': 'Go',
      'rust': 'Rust',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'php': 'PHP',
      'ruby': 'Ruby'
    };
    return names[lang.toLowerCase()] || lang;
  };

  return (
    <div className="code-editor-container bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm text-gray-300 font-medium">
            {filename}.{getFileExtension(language)}
          </span>
          <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded">
            {getLanguageName(language)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                title="Edit Code"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors"
                title="Download Code"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          
          <button
            onClick={handleCopy}
            className={`p-2 rounded transition-colors ${
              isCopied 
                ? 'text-green-400 bg-green-900/20' 
                : 'text-gray-400 hover:text-blue-400 hover:bg-gray-700'
            }`}
            title={isCopied ? 'Copied!' : 'Copy Code'}
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Code Area */}
      <div className="relative">
        {isEditing ? (
          <div className="p-4">
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-64 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded border border-gray-600 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Enter your code here..."
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <pre className="p-4 m-0 overflow-x-auto">
            <code className={`language-${language} text-sm text-gray-100 font-mono leading-relaxed`}>
              {code}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
