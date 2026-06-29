import React from 'react';
import { ShieldAlert, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export const SupabaseSetupGuide = () => {
  const [copied, setCopied] = useState<string | null>(null);

  const envVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_BUCKET'
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-zinc-800">
        <div className="bg-accent p-8 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight">Supabase Setup Required</h1>
          </div>
          <p className="text-white/80 text-lg">
            To enable authentication and database features, you need to connect your Supabase project.
          </p>
        </div>

        <div className="p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm">1</span>
              Get your Supabase Config
            </h2>
            <p className="text-gray-500 mb-4">
              Go to your <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a>, 
              create a project, go to Project Settings &gt; API, and find your Project URL and Anon Key.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm">2</span>
              Set Environment Variables
            </h2>
            <p className="text-gray-500 mb-4">
              Add the following variables to your environment configuration in AI Studio:
            </p>
            <div className="grid gap-2 mb-4">
              {envVars.map((varName) => (
                <div key={varName} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
                  <code className="text-sm font-mono text-accent">{varName}</code>
                  <button 
                    onClick={() => copyToClipboard(varName)}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    {copied === varName ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent text-white text-sm">3</span>
              Initialize Database Schema (Fixes "Infinite Recursion" Errors)
            </h2>
            <p className="text-gray-500 mb-4 leading-relaxed">
              Open the <strong><code className="text-accent bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-sm">supabase_schema.sql</code></strong> file in this project workspace.
              Copy its entire contents, go to your <strong>Supabase Dashboard &gt; SQL Editor</strong>, paste the script, and click <strong>Run</strong>.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl leading-relaxed">
              <strong>Note:</strong> The updated SQL script implements secure RLS policies with a <code className="font-mono">SECURITY DEFINER</code> helper function. This is critical to prevent "infinite recursion" error loops on the profiles and loans relations.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-sm text-gray-400 text-center">
              After setting the variables, the application will automatically refresh and connect to your Supabase project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
