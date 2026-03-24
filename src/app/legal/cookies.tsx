import React from 'react';
import { motion } from 'motion/react';
import { Cookie, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookiePolicyPage = () => {
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
              <Cookie className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black dark:text-white">Cookie Policy</h1>
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 text-gray-600 dark:text-gray-400">
            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">1. What are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device when you visit our website. 
                They help us provide you with a better user experience and analyze our website traffic.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">2. How We Use Cookies</h2>
              <p>We use cookies for various purposes, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Essential cookies: These are necessary for the website to function properly.</li>
                <li>Analytical cookies: These help us understand how you use our website.</li>
                <li>Functional cookies: These allow us to remember your preferences and provide personalized features.</li>
                <li>Advertising cookies: These are used to show you relevant advertisements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">3. Managing Cookies</h2>
              <p>
                You can manage your cookie preferences through your browser settings. 
                Please note that disabling certain cookies may affect your user experience on our website.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">4. Third-Party Cookies</h2>
              <p>
                We may also use third-party cookies from our partners and service providers. 
                These cookies are subject to the privacy policies of the respective third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">5. Changes to this Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. 
                Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold dark:text-white text-primary">6. Contact Us</h2>
              <p>
                If you have any questions about this Cookie Policy, please contact us at cookies@beehivebank.com.
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
