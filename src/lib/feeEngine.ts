
export interface Payment {
  month: string;
  year: number;
  amount: number;
  date: string;
}

export interface OtherFund {
  desc: string;
  amount: number;
  date: string;
}

export interface StudentFeeData {
  id: string | number;
  name: string;
  class: string;
  monthlyFee: number;
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
          newPayments.push({ month: m.month, year, amount: toPay, date });
        }
      }
      
      if (remainingAmount > 0) {
         newPayments.push({ month: targetMonth, year, amount: remainingAmount, date });
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

  const due = isFutureMonth ? 0 : student.monthlyFee;
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
  // Assuming tracking for a specific set of years or current year. 
  // For simplicity, we calculate based on all months that have been "active" or just current year + any historical.
  // In a real system, we'd check which months the student was enrolled. 
  // Here we'll calculate based on the current year's 12 months for demonstration.
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
    if (s.id === studentId) {
      return {
        ...s,
        otherFunds: [...s.otherFunds, { desc: description, amount, date }]
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
  return data ? JSON.parse(data) : [];
};
