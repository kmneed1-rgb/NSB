import React, { useState } from 'react';
import { FeeRecord, Student } from '../types';
import { PlusCircle, Trash2, Calendar, CreditCard, CheckCircle2 } from 'lucide-react';

interface CashPaymentEntryProps {
  studentId: string;
  fees: FeeRecord[];
  setFees: React.Dispatch<React.SetStateAction<FeeRecord[]>>;
  studentName?: string;
}

export default function CashPaymentEntry({ studentId, fees, setFees, studentName }: CashPaymentEntryProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [feeType, setFeeType] = useState('Tuition Fee');

  const handleAddPayment = () => {
    if (!amount) return;
    const newRecord: FeeRecord = {
      id: Math.random().toString(36).substr(2, 9),
      studentId,
      amount: Number(amount),
      dueDate: date,
      status: 'paid',
      paidDate: date,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      paymentMethod: 'Cash',
      feeType,
    };
    setFees(prev => [newRecord, ...prev]);
    setAmount('');
  };

  const myPayments = fees.filter(f => f.studentId === studentId && f.status === 'paid');

  return (
    <div className="bg-white p-6 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
      <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-6">Cash Collection: {studentName}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <input 
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="Cash Amount (Rs)"
          className="p-3 border-2 border-slate-900 font-bold"
        />
        <input 
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)}
          className="p-3 border-2 border-slate-900 font-bold"
        />
        <button 
          onClick={handleAddPayment}
          className="bg-slate-900 text-white font-black uppercase p-3 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle size={20} /> Add Payment
        </button>
      </div>

      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-slate-900">
            <th className="p-3 uppercase text-[10px] font-black text-slate-500">Date</th>
            <th className="p-3 uppercase text-[10px] font-black text-slate-500">Type</th>
            <th className="p-3 uppercase text-[10px] font-black text-slate-500 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {myPayments.map(p => (
            <tr key={p.id}>
              <td className="p-3 text-[12px] font-bold">{p.paidDate}</td>
              <td className="p-3 text-[12px] font-bold">{p.feeType}</td>
              <td className="p-3 text-[12px] font-black text-emerald-600 text-right">Rs {p.amount.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
