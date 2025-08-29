import React, { useState, useEffect } from 'react';
import { ChevronDown, Brain, Zap, Crown } from 'lucide-react';

interface Model {
  name: string;
  description: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topK: number;
}

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<Record<string, Model>>({});
  const [defaultModel, setDefaultModel] = useState<string>('');

  useEffect(() => {
    // Fetch available models from backend
    fetch('http://localhost:8080/api/models')
      .then(response => response.json())
      .then(data => {
        setModels(data.models);
        setDefaultModel(data.defaultModel);
      })
      .catch(error => {
        console.error('Failed to fetch models:', error);
        // Fallback models if API fails - using brand names
        setModels({
          "gemini-2.0-flash": {
            name: "LashivGPT Fast",
            description: "Quick and efficient responses for fast interactions",
            maxTokens: 8192,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
          },
          "gemini-2.5-pro": {
            name: "LashivGPT Pro",
            description: "Most advanced AI with enhanced reasoning capabilities",
            maxTokens: 32768,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
          },
          "gemini-1.5-pro": {
            name: "LashivGPT Standard",
            description: "Balanced performance with good cost efficiency",
            maxTokens: 16384,
            temperature: 0.7,
            topP: 0.8,
            topK: 40,
          }
        });
        setDefaultModel("gemini-2.0-flash");
      });
  }, []);

  const getModelIcon = (modelKey: string) => {
    switch (modelKey) {
      case 'gemini-2.5-pro':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 'gemini-2.0-flash':
        return <Zap className="w-4 h-4 text-blue-500" />;
      case 'gemini-1.5-pro':
        return <Brain className="w-4 h-4 text-green-500" />;
      default:
        return <Brain className="w-4 h-4 text-gray-500" />;
    }
  };

  const getModelBadge = (modelKey: string) => {
    switch (modelKey) {
      case 'gemini-2.5-pro':
        return <span className="px-2 py-1 text-xs bg-yellow-900 text-yellow-200 rounded-full">Pro</span>;
      case 'gemini-2.0-flash':
        return <span className="px-2 py-1 text-xs bg-blue-900 text-blue-200 rounded-full">Fast</span>;
      case 'gemini-1.5-pro':
        return <span className="px-2 py-1 text-xs bg-green-900 text-green-200 rounded-full">Standard</span>;
      default:
        return null;
    }
  };

  const selectedModelData = models[selectedModel] || models[defaultModel];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200
          ${disabled 
            ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
            : 'bg-gray-900 border-gray-700 text-gray-200 hover:bg-gray-800 hover:border-gray-600'
          }
        `}
      >
        {getModelIcon(selectedModel)}
        <div className="text-left">
          <div className="text-sm font-medium">{selectedModelData?.name || 'Loading...'}</div>
          <div className="text-xs text-gray-400">{selectedModelData?.description || ''}</div>
        </div>
        {getModelBadge(selectedModel)}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-gray-700">
            <h3 className="text-sm font-medium text-gray-200">Select AI Model</h3>
            <p className="text-xs text-gray-400">Choose the model that best fits your needs</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {Object.entries(models).map(([key, model]) => (
              <button
                key={key}
                onClick={() => {
                  onModelChange(key);
                  setIsOpen(false);
                }}
                className={`
                  w-full p-3 text-left border-l-4 transition-all duration-200 hover:bg-gray-700
                  ${key === selectedModel 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-transparent'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {getModelIcon(key)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">{model.name}</span>
                      {getModelBadge(key)}
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{model.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Max: {model.maxTokens.toLocaleString()} tokens</span>
                      <span>Temp: {model.temperature}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-700 bg-gray-900/50">
            <div className="text-xs text-gray-400">
              <strong>Note:</strong> Different models may have varying response times and capabilities.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
