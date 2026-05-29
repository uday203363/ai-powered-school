import React, { useState, useEffect } from 'react';
import { Card, Table } from '../../components/common';
import { feeService } from '../../services';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export const StudentFeesPage: React.FC = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(false);

  // Check if student is active
  if (user?.role === 'student' && user?.status && user.status !== 'Active') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Inactive</h2>
          <p className="text-gray-600 mb-4">
            Your account status is <strong>{user.status}</strong>. 
            You cannot access this page.
          </p>
          <p className="text-gray-500 text-sm">
            Please contact the school administration for more information.
          </p>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    setLoading(true);
    if (user?.id) {
      const result = await feeService.getFeesByStudent(user.id);
      if (result.success) {
        setFees(result.data || []);

        let total = 0,
          paid = 0,
          pending = 0;
        result.data?.forEach((fee: any) => {
          total += fee.total_amount || 0;
          paid += fee.paid_amount || 0;
          pending += fee.balance || 0;
        });

        setTotalStats({ total, paid, pending });
      }
    }
    setLoading(false);
  };

  const tableRows = fees.map((fee) => [
    `${typeof fee.month === 'string' && fee.month !== 'Registration' ? fee.month.toUpperCase() : fee.month}/${fee.year}`,
    '₹' + fee.total_amount,
    '₹' + fee.paid_amount,
    '₹' + fee.balance,
    fee.status.toUpperCase(),
    new Date(fee.due_date).toLocaleDateString(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">My Fees</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-gray-600 text-sm">Total Dues</p>
          <p className="text-3xl font-bold text-primary">₹{totalStats.total}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Amount Paid</p>
          <p className="text-3xl font-bold text-secondary">₹{totalStats.paid}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-3xl font-bold text-danger">₹{totalStats.pending}</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-bold mb-4">Fee Details</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : fees.length > 0 ? (
          <Table
            headers={['Month', 'Total', 'Paid', 'Balance', 'Status', 'Due Date']}
            rows={tableRows}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            No fee records available
          </div>
        )}
      </Card>
    </div>
  );
};
