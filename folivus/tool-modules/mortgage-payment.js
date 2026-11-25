// מחשבון החזר חודשי במשכנתא בלוח שפיצר (החזר חודשי קבוע) - פוליבוס
// נוסחה: P = L × r / (1 - (1 + r)^-n), כאשר r ריבית שנתית נומינלית / 12 ו-n מספר החודשים.
// מניח ריבית קבועה ולא צמודה למשך כל התקופה.

const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("he-IL") + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const L = Number(inputs.loan_amount);
  const annual = Number(inputs.annual_rate);
  const years = Number(inputs.years);
  if (!(L > 0)) errors.push("יש להזין סכום הלוואה חיובי.");
  if (!(annual >= 0) || annual > 30) errors.push("יש להזין ריבית שנתית בין 0% ל-30%.");
  if (!(years > 0) || years > 50) errors.push("יש להזין תקופה בין שנה ל-50 שנים.");
  if (errors.length) return { outputs: null, steps: [], errors };

  const n = Math.round(years * 12);
  const r = annual / 100 / 12;
  const steps = [];
  let payment;
  if (r === 0) {
    payment = L / n;
    steps.push(`ריבית 0%: ההחזר הוא הקרן חלקי ${n} חודשים.`);
  } else {
    payment = (L * r) / (1 - Math.pow(1 + r, -n));
    steps.push(`ריבית חודשית: ${annual}% / 12 = ${(r * 100).toFixed(4)}%. מספר תשלומים: ${n}.`);
    steps.push(`החזר חודשי = ${fmt(L)} × ${r.toFixed(6)} / (1 פחות (1 + ${r.toFixed(6)}) בחזקת מינוס ${n}).`);
  }
  const totalPaid = payment * n;
  const firstInterest = L * r;
  const firstPrincipal = payment - firstInterest;
  steps.push(`החזר חודשי קבוע: ${fmt(payment)}.`);
  steps.push(`בחודש הראשון: ריבית ${fmt(firstInterest)}, קרן ${fmt(firstPrincipal)}. עם הזמן חלק הקרן גדל וחלק הריבית קטן.`);
  steps.push(`סך התשלומים: ${fmt(totalPaid)}. סך הריבית: ${fmt(totalPaid - L)}.`);
  steps.push("החישוב אינו כולל הצמדה למדד, שינויי ריבית במסלול משתנה, ביטוחים ועמלות.");
  const r2 = (x) => Math.round(x * 100) / 100;
  return {
    outputs: {
      monthly_payment: r2(payment),
      total_paid: r2(totalPaid),
      total_interest: r2(totalPaid - L),
      first_month_interest: r2(firstInterest),
      first_month_principal: r2(firstPrincipal),
    },
    steps,
  };
}
