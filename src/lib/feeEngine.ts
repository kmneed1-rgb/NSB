
export interface Payment {
  id: string;
  month: string;
  year: number;
  amount: number;
  date: string;
}

export interface OtherFund {
  id: string;
  desc: string;
  amount: number;
  date: string;
}

export interface StudentFeeData {
  id: string | number;
  name: string;
  class: string;
  monthlyFee: number;
  enrollmentMonth?: string;
  payments: Payment[];
  otherFunds: OtherFund[];
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export type Month = typeof MONTHS[number];

/**
 * Core Fee Engine Functions
 */

// 1. addPayment - Partial payment support
export const addPayment = (students: StudentFeeData[], studentId: string | number, targetMonth: string, year: number, amount: number): StudentFeeData[] => {
  const date = new Date().toISOString().split('T')[0];
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      let remainingAmount = amount;
      const newPayments = [...s.payments];
      const yearly = getYearlySummary(s, year);
      
      for (const m of yearly) {
        if (!m.isFutureMonth && m.pending > 0 && remainingAmount > 0) {
          const toPay = Math.min(m.pending, remainingAmount);
          remainingAmount -= toPay;
          newPayments.push({ id: Math.random().toString(36).substr(2, 9), month: m.month, year, amount: toPay, date });
        }
      }
      
      if (remainingAmount > 0) {
         newPayments.push({ id: Math.random().toString(36).substr(2, 9), month: targetMonth, year, amount: remainingAmount, date });
      }

      return {
        ...s,
        payments: newPayments
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 1.1 deletePayment
export const deletePayment = (students: StudentFeeData[], studentId: string | number, paymentId: string): StudentFeeData[] => {
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return {
        ...s,
        payments: s.payments.filter(p => p.id !== paymentId)
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 1.2 editPayment
export const editPayment = (students: StudentFeeData[], studentId: string | number, paymentId: string, newAmount: number): StudentFeeData[] => {
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return {
        ...s,
        payments: s.payments.map(p => p.id === paymentId ? { ...p, amount: newAmount } : p)
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 2. getMonthlySummary - { due, paid, pending }
export const getMonthlySummary = (student: StudentFeeData, month: string, year: number) => {
  const monthIndex = MONTHS.indexOf(month as Month);
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  let isFutureMonth = false;
  if (year > currentYear) {
    isFutureMonth = true;
  } else if (year === currentYear && monthIndex > currentMonthIndex) {
    isFutureMonth = true;
  }

  // Check enrollment month
  let isBeforeEnrollment = false;
  if (student.enrollmentMonth) {
    const enrollIndex = MONTHS.indexOf(student.enrollmentMonth as Month);
    if (enrollIndex > monthIndex) {
      isBeforeEnrollment = true;
    }
  }

  const due = (isFutureMonth || isBeforeEnrollment) ? 0 : student.monthlyFee;
  const paid = student.payments
    .filter(p => p.month === month && p.year === year)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pending = Math.max(0, due - paid);
  return { due, paid, pending, isFutureMonth };
};

// 3. getYearlySummary - 12 months array
export const getYearlySummary = (student: StudentFeeData, year: number) => {
  return MONTHS.map(month => {
    const summary = getMonthlySummary(student, month, year);
    return {
      month,
      ...summary,
      isComplete: summary.due > 0 && summary.pending === 0 // only complete if it actually had due
    };
  });
};

// 4. getTotalPending - sum of all months pending
export const getTotalPending = (student: StudentFeeData) => {
  const currentYear = new Date().getFullYear();
  const yearly = getYearlySummary(student, currentYear);
  return yearly.reduce((sum, m) => sum + m.pending, 0);
};

// 5. getTotalCollected - total wusooli
export const getTotalCollected = (student: StudentFeeData) => {
  return student.payments.reduce((sum, p) => sum + p.amount, 0);
};

// 6. addOtherFund
export const addOtherFund = (students: StudentFeeData[], studentId: string | number, description: string, amount: number): StudentFeeData[] => {
  const date = new Date().toISOString().split('T')[0];
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return {
        ...s,
        otherFunds: [...s.otherFunds, { id: Math.random().toString(36).substr(2, 9), desc: description, amount, date }]
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 6.1 deleteOtherFund
export const deleteOtherFund = (students: StudentFeeData[], studentId: string | number, fundId: string): StudentFeeData[] => {
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return {
        ...s,
        otherFunds: s.otherFunds.filter(f => f.id !== fundId)
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 6.2 editOtherFund
export const editOtherFund = (students: StudentFeeData[], studentId: string | number, fundId: string, newDesc: string, newAmount: number): StudentFeeData[] => {
  const updatedStudents = students.map(s => {
    if (String(s.id) === String(studentId)) {
      return {
        ...s,
        otherFunds: s.otherFunds.map(f => f.id === fundId ? { ...f, desc: newDesc, amount: newAmount } : f)
      };
    }
    return s;
  });
  saveToLocalStorage(updatedStudents);
  return updatedStudents;
};

// 7. getTotalOtherFunds
export const getTotalOtherFunds = (student: StudentFeeData) => {
  return student.otherFunds.reduce((sum, f) => sum + f.amount, 0);
};

// 8. getStudentFullAccount
export const getStudentFullAccount = (student: StudentFeeData, year: number) => {
  const yearlyBreakdown = getYearlySummary(student, year);
  
  const currentMonthIndex = new Date().getMonth();
  
  // Calculate totals for all months
  const totalDue = yearlyBreakdown.reduce((sum, m) => sum + m.due, 0);
  const totalPaid = yearlyBreakdown.reduce((sum, m) => sum + m.paid, 0);
  const totalPending = yearlyBreakdown.reduce((sum, m) => sum + m.pending, 0);
  
  const otherFundsTotal = getTotalOtherFunds(student);

  return {
    yearlyBreakdown,
    totalDue,
    totalPaid,
    totalPending,
    otherFunds: student.otherFunds,
    otherFundsTotal,
    grandTotalPending: totalPending + otherFundsTotal
  };
};

// 9. getGlobalStats
export const getGlobalStats = (students: StudentFeeData[]) => {
  const totalStudents = students.length;
  let totalCollected = 0;
  let totalPending = 0;
  let totalOther = 0;

  students.forEach(s => {
    totalCollected += getTotalCollected(s);
    totalPending += getTotalPending(s);
    totalOther += getTotalOtherFunds(s);
  });

  return {
    totalStudents,
    totalCollected,
    totalPending,
    totalOther
  };
};

// Persistence
export const saveToLocalStorage = (students: StudentFeeData[]) => {
  localStorage.setItem('school_fee_data', JSON.stringify(students));
};

export const loadFromLocalStorage = (): StudentFeeData[] => {
  const data = localStorage.getItem('school_fee_data');
  if (!data) return [];
  try {
    const parsed: StudentFeeData[] = JSON.parse(data);
    // Migration: ensure all payments and otherFunds have IDs
    return parsed.map(s => ({
      ...s,
      payments: (s.payments || []).map(p => ({
        ...p,
        id: p.id || Math.random().toString(36).substr(2, 9)
      })),
      otherFunds: (s.otherFunds || []).map(f => ({
        ...f,
        id: f.id || Math.random().toString(36).substr(2, 9)
      }))
    }));
  } catch (e) {
    console.error("Error loading fee data:", e);
    return [];
  }
};
