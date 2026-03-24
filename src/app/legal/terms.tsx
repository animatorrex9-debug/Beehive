import React from 'react';
import { motion } from 'motion/react';
import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-primary py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-accent font-bold mb-12 hover:gap-3 transition-all">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-12"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black dark:text-white">Terms of Service</h1>
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">
            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Beehive Bank's services, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">2. Eligibility</h2>
              <p>
                To use our services, you must be at least 18 years old and have the legal capacity to enter into a binding agreement. 
                You must also provide accurate and complete information during the registration process.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">3. Account Security</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. 
                You must notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">4. Banking Services</h2>
              <p>
                Our services include digital banking, loans, investments, and currency swaps. 
                All services are subject to specific terms and conditions, which will be provided to you before you use them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">5. Prohibited Activities</h2>
              <p>You agree not to use our services for any illegal or unauthorized purpose, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Money laundering or terrorist financing</li>
                <li>Fraud or misrepresentation</li>
                <li>Unauthorized access to our systems</li>
                <li>Interfering with the use of our services by others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">6. Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time, with or without notice, 
                if we believe you have violated these Terms of Service or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">7. Limitation of Liability</h2>
              <p>
                Beehive Bank shall not be liable for any indirect, incidental, special, or consequential damages 
                arising out of or in connection with your use of our services.
              </p>
            </section>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-100 dark:border-zinc-800">
            <p className="text-sm text-gray-500">Last updated: March 23, 2026</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
