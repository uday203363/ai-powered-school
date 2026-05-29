import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, Table } from '../../components/common';
import { feeService } from '../../services';
import { RefreshCw } from 'lucide-react';
import { normalizeString } from '../../utils/normalize';

export const AdminFeesPage: React.FC = () => {
  const [fees, setFees] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeeData();
  }, []);

  const loadFeeData = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('📌 [AdminFeesPage] Loading all fees...');
      
      // Get all fees from all classes
      const feesResult = await feeService.getAllFees();
      
      if (feesResult.success && feesResult.data) {
        console.log(`✅ [AdminFeesPage] Loaded ${feesResult.data.length} fee records`);
        setFees(feesResult.data);

        // Calculate statistics from real data
        let totalAmount = 0;
        let paidAmount = 0;
        let pendingAmount = 0;

        feesResult.data.forEach((fee: any) => {
          totalAmount += fee.total_amount || 0;
          paidAmount += fee.paid_amount || 0;
          pendingAmount += fee.balance || 0;
        });

        setStats({
          total: totalAmount,
          paid: paidAmount,
          pending: pendingAmount
        });

        console.log(`✅ [AdminFeesPage] Statistics:`, { totalAmount, paidAmount, pendingAmount });
      } else {
        console.warn('⚠️ [AdminFeesPage] No fees found or error occurred');
        setFees([]);
        setStats({ total: 0, paid: 0, pending: 0 });
        if (feesResult.error) {
          setError(feesResult.error);
        }
      }
    } catch (err) {
      console.error('❌ [AdminFeesPage] Error loading fees:', err);
      setError('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  const tableRows = fees.map((fee) => [
    fee.register_no || 'N/A',
    normalizeString(fee.student_name || 'Unknown'),
    fee.class || 'N/A',
    `${fee.month || 'N/A'}/${fee.year || 'N/A'}`,
    '₹' + (fee.total_amount || 0),
    '₹' + (fee.paid_amount || 0),
    '₹' + (fee.balance || 0),
    (fee.status || 'pending').toUpperCase(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
        <Button 
          onClick={loadFeeData} 
          className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700"
          disabled={loading}
        >
          <RefreshCw size={18} />
          <span>Refresh</span>
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ❌ {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <p className="text-gray-600 text-sm">Total Fees</p>
          <p className="text-3xl font-bold text-primary">₹{stats.total.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Amount Paid</p>
          <p className="text-3xl font-bold text-secondary">₹{stats.paid.toFixed(2)}</p>
        </Card>
        <Card>
          <p className="text-gray-600 text-sm">Pending Amount</p>
          <p className="text-3xl font-bold text-danger">₹{stats.pending.toFixed(2)}</p>
        </Card>
      </div>

      {/* Fees Table */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Fee Records</h2>
            <p className="text-gray-600 text-sm mt-1">
              {loading ? 'Loading...' : `Total: ${fees.length} records`}
            </p>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Loading fee data...</p>
          </div>
        ) : fees.length > 0 ? (
          <Table
            headers={['Register No', 'Student', 'Class', 'Month/Year', 'Total', 'Paid', 'Balance', 'Status']}
            rows={tableRows}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No fee records found</p>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Fee">
        <div className="space-y-4">
          <p className="text-gray-600">
            Use the Class Fee Management section in the Teacher Dashboard to add fees.
          </p>
          <Button onClick={() => setShowModal(false)} className="w-full">
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};
