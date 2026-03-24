import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPolicyPage = () => {
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
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black dark:text-white">Privacy Policy</h1>
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">
            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">1. Introduction</h2>
              <p>
                At Beehive Bank, we are committed to protecting your privacy and ensuring the security of your personal information. 
                This Privacy Policy explains how we collect, use, and safeguard your data when you use our digital banking services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">2. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Personal identification information (Name, email address, phone number, etc.)</li>
                <li>Financial information (Bank account details, transaction history, etc.)</li>
                <li>KYC documentation (Government-issued ID, proof of address, etc.)</li>
                <li>Device and usage information (IP address, browser type, app usage patterns)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">3. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and maintain our banking services</li>
                <li>Process transactions and send notifications</li>
                <li>Verify your identity and prevent fraud</li>
                <li>Improve our products and customer experience</li>
                <li>Comply with legal and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">4. Data Security</h2>
              <p>
                We implement bank-level security measures, including 256-bit encryption and multi-factor authentication, 
                to protect your data from unauthorized access, disclosure, or alteration.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal information. 
                You can manage your data preferences through your account settings or by contacting our support team.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">6. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@beehivebank.com.
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
