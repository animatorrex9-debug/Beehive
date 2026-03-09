import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const LoanStatusPage = () => {
  const { activeLoan } = useOutletContext<{ activeLoan: any }>();

  return (
    <div className="card">
      <h2 className="text-2xl font-black tracking-tighter mb-4 uppercase dark:text-white">Loan Status</h2>
      {activeLoan ? (
        <div className="space-y-4">
          <p className="text-gray-500">Current Status: <span className="font-bold text-accent uppercase">{activeLoan.status}</span></p>
          {/* Status specific UI would go here */}
        </div>
      ) : (
        <p className="text-gray-500">You have no active loan applications.</p>
      )}
    </div>
  );
};
