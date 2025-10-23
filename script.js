fetch("https://script.google.com/macros/s/AKfycbw1OQxcByLThXIHftk5ij1Gi-mB2C0VhpxdCB6s0gZEFeXs1DIbtgyO_H6GODmX75CjtQ/exec")
  .then(response => response.json())
  .then(data => {
    const today = new Date();
    const dailyRevenue = {};
    const weeklyRevenue = {};
    const monthlyRevenue = {};
    const productRevenue = {};
    const customerRevenue = {};
    const customerOrders = {};
    const customerCredit = {};
    const customerSettled = {};

    // KPI values
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalCredit = 0;
    let settledCount = 0;
    let creditCount = 0;

    // Prepare last 14 days for revenue
    const last14Days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
      last14Days.push(key);
      dailyRevenue[key] = 0;
    }

    data.forEach(row => {
      const rawDate = new Date(row["Date"]);
      const revenue = parseFloat(row["Revenue"]);
      const paid = parseFloat(row["Paid Amount"]);
      const credit = parseFloat(row["Credit Balance"]);
      const status = row["Payment Status"];
      const product = row["Product"];
      const customer = row["CustomerName"];

      if (isNaN(revenue)) return;

      // Global KPIs
      totalRevenue += revenue;
      if (!isNaN(paid)) totalPaid += paid;
      if (!isNaN(credit)) totalCredit += credit;
      if (status === "Settled") settledCount++;
      else if (status === "Credit") creditCount++;

      // Revenue Trends
      const dateKey = rawDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
      if (dailyRevenue.hasOwnProperty(dateKey)) {
        dailyRevenue[dateKey] += revenue;
      }

      const weekStart = new Date(rawDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
      weeklyRevenue[weekKey] = (weeklyRevenue[weekKey] || 0) + revenue;

      const monthKey = rawDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).replace(/ /g, "-");
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + revenue;

      // Top Products
      productRevenue[product] = (productRevenue[product] || 0) + revenue;

      // Customer Insights
      if (customer) {
        customerRevenue[customer] = (customerRevenue[customer] || 0) + revenue;
        customerOrders[customer] = (customerOrders[customer] || 0) + 1;

        if (status === "Credit") {
          customerCredit[customer] = (customerCredit[customer] || 0) + 1;
        } else if (status === "Settled") {
          customerSettled[customer] = (customerSettled[customer] || 0) + 1;
        }
      }
    });

    // RENDER REVENUE KPI CARDS
    const kpiContainer = document.getElementById("kpiContainer");
    const kpis = [
      { label: "Total Revenue", value: `₹${totalRevenue.toLocaleString()}` },
      { label: "Total Paid Amount", value: `₹${totalPaid.toLocaleString()}` },
      { label: "Total Credit Balance", value: `₹${totalCredit.toLocaleString()}` },
      { label: "Settled Orders", value: settledCount },
      { label: "Credit Orders", value: creditCount }
    ];
    kpis.forEach(kpi => {
      const card = document.createElement("div");
      card.className = "kpiCard";
      card.innerHTML = `<h3>${kpi.label}</h3><p>${kpi.value}</p>`;
      kpiContainer.appendChild(card);
    });

    // TOP PRODUCTS CHART
    const sortedProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    new Chart(document.getElementById("topProductsChart"), {
      type: "bar",
      data: {
        labels: sortedProducts.map(p => p[0]),
        datasets: [{
          label: "Revenue (₹)",
          data: sortedProducts.map(p => p[1]),
          backgroundColor: "#17a2b8"
        }]
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { title: { display: true, text: 'Revenue (₹)' } }, y: { title: { display: true, text: 'Product' } } } }
    });

    // DAILY REVENUE CHART
    new Chart(document.getElementById("dailyChart"), {
      type: "line",
      data: {
        labels: last14Days,
        datasets: [{ label: "Revenue (₹)", data: last14Days.map(date => dailyRevenue[date]), borderColor: "#007bff", backgroundColor: "rgba(0,123,255,0.1)", fill: true, tension: 0.3 }]
      },
      options: { responsive: true, scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Revenue (₹)' } } } }
    });

    // WEEKLY REVENUE CHART
    const sortedWeeks = Object.keys(weeklyRevenue).sort((a, b) => new Date(a.split("-").reverse().join("-")) - new Date(b.split("-").reverse().join("-")));
    const last4Weeks = sortedWeeks.slice(-4);
    new Chart(document.getElementById("weeklyChart"), {
      type: "bar",
      data: {
        labels: last4Weeks,
        datasets: [{ label: "Weekly Revenue (₹)", data: last4Weeks.map(w => weeklyRevenue[w]), backgroundColor: "#ffc107" }]
      },
      options: { responsive: true, scales: { x: { title: { display: true, text: 'Week Starting' } }, y: { title: { display: true, text: 'Revenue (₹)' } } } }
    });

    // MONTHLY REVENUE CHART
    const sortedMonths = Object.keys(monthlyRevenue).sort((a, b) => {
      const [monthA, yearA] = a.split("-");
      const [monthB, yearB] = b.split("-");
      return new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`);
    });
    new Chart(document.getElementById("monthlyChart"), {
      type: "bar",
      data: {
        labels: sortedMonths,
        datasets: [{ label: "Monthly Revenue (₹)", data: sortedMonths.map(m => monthlyRevenue[m]), backgroundColor: "#28a745" }]
      },
      options: { responsive: true, scales: { x: { title: { display: true, text: 'Month' } }, y: { title: { display: true, text: 'Revenue (₹)' } } } }
    });

    // TOP CUSTOMERS CHART
    const topCustomers = Object.entries(customerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    new Chart(document.getElementById("topCustomersChart"), {
      type: "bar",
      data: {
        labels: topCustomers.map(c => c[0]),
        datasets: [{ label: "Revenue (₹)", data: topCustomers.map(c => c[1]), backgroundColor: "#6610f2" }]
      },
      options: { indexAxis: 'y', responsive: true, scales: { x: { title: { display: true, text: 'Revenue (₹)' } }, y: { title: { display: true, text: 'Customer' } } } }
    });

    // CUSTOMER KPI CARDS
    const customerKPIContainer = document.getElementById("customerKPIContainer");
    const totalCustomers = Object.keys(customerRevenue).length;
    const totalOrders = Object.values(customerOrders).reduce((a, b) => a + b, 0);
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0.00";
    const topCustomerName = topCustomers[0] ? topCustomers[0][0] : "N/A";
    const totalCustomerSettled = Object.values(customerSettled).reduce((a, b) => a + b, 0);
    const totalCustomerCredit = Object.values(customerCredit).reduce((a, b) => a + b, 0);

    const customerKPIs = [
      { label: "Total Customers", value: totalCustomers },
      { label: "Top Customer", value: topCustomerName },
      { label: "Avg Order Value", value: `₹${avgOrderValue}` },
      { label: "Settled Orders", value: totalCustomerSettled },
      { label: "Credit Orders", value: totalCustomerCredit }
    ];
    customerKPIs.forEach(kpi => {
      const card = document.createElement("div");
      card.className = "kpiCard";
      card.innerHTML = `<h3>${kpi.label}</h3><p>${kpi.value}</p>`;
      customerKPIContainer.appendChild(card);
    });


    // FETCH EXPENSES DATA AND RENDER
    fetch("https://script.google.com/macros/s/AKfycbxdRMDO7U3YRrMlMPp_75lsDm1cbBXA-qBZytq0Q8LB76I00wUtIy4k59TzxLulSsTXXA/exec?sheet=Expenses")
      .then(response => response.json())
      .then(expenses => {
        const dailyExpense = {};
        const weeklyExpense = {};
        const monthlyExpense = {};
        const categoryExpense = {};
        const paymentMethods = { UPI: 0, Cash: 0, Other: 0 };
        let totalExpense = 0;

        // Prepare last 14 days for expense
        const last14DaysExp = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
          last14DaysExp.push(key);
          dailyExpense[key] = 0;
        }

        expenses.forEach(row => {
          const rawDate = new Date(row["Date"]);
          const amount = parseFloat(row["Amount (₹)"]);
          const category = row["Category"];
          const method = row["Payment Method"];

          if (isNaN(amount)) return;
          totalExpense += amount;

          // Daily
          const dateKey = rawDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
          if (dailyExpense.hasOwnProperty(dateKey)) {
            dailyExpense[dateKey] += amount;
          }

          // Weekly
          const weekStart = new Date(rawDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
          weeklyExpense[weekKey] = (weeklyExpense[weekKey] || 0) + amount;

          // Monthly
          const monthKey = rawDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" }).replace(/ /g, "-");
          monthlyExpense[monthKey] = (monthlyExpense[monthKey] || 0) + amount;

          // Category
          categoryExpense[category] = (categoryExpense[category] || 0) + amount;

          // Payment Method
          if (paymentMethods.hasOwnProperty(method)) {
            paymentMethods[method] += amount;
          }
        });

        // Expense KPIs
        const topCategory = Object.entries(categoryExpense).sort((a, b) => b[1] - a[1])[0];
        const expenseKPIContainer = document.getElementById("expenseKPIContainer");
        const expenseKPIs = [
          { label: "Total Expenses", value: `₹${totalExpense.toLocaleString()}` },
          { label: "Top Category", value: topCategory ? topCategory[0] : "N/A" },
          { label: "UPI Payments", value: `₹${paymentMethods.UPI.toLocaleString()}` },
          { label: "Cash Payments", value: `₹${paymentMethods.Cash.toLocaleString()}` },
          { label: "Other Payments", value: `₹${paymentMethods.Other.toLocaleString()}` }
        ];
        expenseKPIs.forEach(kpi => {
          const card = document.createElement("div");
          card.className = "kpiCard";
          card.innerHTML = `<h3>${kpi.label}</h3><p>${kpi.value}</p>`;
          expenseKPIContainer.appendChild(card);
        });

        // Daily Expense Chart
        new Chart(document.getElementById("dailyExpenseChart"), {
          type: "line",
          data: { labels: last14DaysExp, datasets: [{ label: "Expenses (₹)", data: last14DaysExp.map(date => dailyExpense[date]), borderColor: "#dc3545", backgroundColor: "rgba(220,53,69,0.1)", fill: true, tension: 0.3 }] },
          options: { responsive: true, scales: { x: { title: { display: true, text: 'Date' } }, y: { title: { display: true, text: 'Expenses (₹)' } } } }
        });

        // Weekly Expense Chart
        const sortedWeeksExp = Object.keys(weeklyExpense).sort((a, b) => new Date(a.split("-").reverse().join("-")) - new Date(b.split("-").reverse().join("-")));
        const last4WeeksExp = sortedWeeksExp.slice(-4);
        new Chart(document.getElementById("weeklyExpenseChart"), {
          type: "bar",
          data: { labels: last4WeeksExp, datasets: [{ label: "Weekly Expenses (₹)", data: last4WeeksExp.map(w => weeklyExpense[w]), backgroundColor: "#fd7e14" }] },
          options: { responsive: true, scales: { x: { title: { display: true, text: 'Week Starting' } }, y: { title: { display: true, text: 'Expenses (₹)' } } } }
        });

        // Monthly Expense Chart
        const sortedMonthsExp = Object.keys(monthlyExpense).sort((a, b) => {
          const [monthA, yearA] = a.split("-");
          const [monthB, yearB] = b.split("-");
          return new Date(`${monthA} 1, ${yearA}`) - new Date(`${monthB} 1, ${yearB}`);
        });
        new Chart(document.getElementById("monthlyExpenseChart"), {
          type: "bar",
          data: { labels: sortedMonthsExp, datasets: [{ label: "Monthly Expenses (₹)", data: sortedMonthsExp.map(m => monthlyExpense[m]), backgroundColor: "#6f42c1" }] },
          options: { responsive: true, scales: { x: { title: { display: true, text: 'Month' } }, y: { title: { display: true, text: 'Expenses (₹)' } } } }
        });

        // Top Expense Categories Chart
        const topCategories = Object.entries(categoryExpense)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        new Chart(document.getElementById("topExpenseChart"), {
          type: "bar",
          data: { labels: topCategories.map(c => c[0]), datasets: [{ label: "Expenses (₹)", data: topCategories.map(c => c[1]), backgroundColor: "#20c997" }] },
          options: { indexAxis: 'y', responsive: true, scales: { x: { title: { display: true, text: 'Expenses (₹)' } }, y: { title: { display: true, text: 'Category' } } } }
        });

        // PROFIT KPIs
        const grossProfit = totalRevenue - totalExpense;
        const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) : "0.00";

        const profitKPIContainer = document.getElementById("profitKPIContainer");
        const profitKPIs = [
          { label: "Gross Profit", value: `₹${grossProfit.toLocaleString()}` },
          { label: "Gross Margin", value: `${grossMargin}%` }
        ];

        profitKPIs.forEach(kpi => {
          const card = document.createElement("div");
          card.className = "kpiCard";
          // Changing color to reflect positive/negative profit more accurately
          const profitColor = grossProfit >= 0 ? "#28a745" : "#dc3545"; 
          card.innerHTML = `<h3>${kpi.label}</h3><p style="color: ${profitColor};">${kpi.value}</p>`;
          profitKPIContainer.appendChild(card);
        });

      });

  });

function exportPDF() {
  window.print(); // Simple fallback — prints to PDF via browser
}
