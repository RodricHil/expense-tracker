"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPen, faChartPie, faEye, faWallet, faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import EditExpenseModal from "@/app/components/EditExpenseModal";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import DateRangeFilter from "@/app/components/DateRangeFilter";
import Pagination from "@/app/components/Pagination";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";

type Expense = {
  _id: string;
  date: string;
  description: string;
  quantity?: number;
  mode: string;
  type: string;
  amount: number;
};

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

const ITEMS_PER_PAGE = 20;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [totalSpent, setTotalSpent] = useState(0);
  const [filteredSpent, setFilteredSpent] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    label: "Last 30 Days",
  });

  const fetchExpenses = async () => {
    const res = await fetch("/api/expenses");
    if (res.ok) {
      const data = await res.json();
      setExpenses(data);

      // Calculate total spent
      const total = data.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
      setTotalSpent(total);

      // Filter and calculate filtered spent
      filterExpensesByRange(data, dateRange);
    }
  };

  const { showNotification } = useNotification();

const filterExpensesByRange = (
  allExpenses: Expense[],
  range: DateRange
) => {
  const filtered = allExpenses.filter((exp: Expense) => {
    const expDate = new Date(exp.date); // already UTC from MongoDB

    return (
      expDate >= range.startDate &&
      expDate <= range.endDate
    );
  });

  setFilteredExpenses(filtered);

  const filtered_total = filtered.reduce(
    (sum: number, exp: Expense) => sum + exp.amount,
    0
  );

  setFilteredSpent(filtered_total);
};


  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to page 1 when date range changes
    filterExpensesByRange(expenses, range);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = (id: string) => {
    setDeletingExpenseId(id);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpenseId) return;

    setIsDeleting(true);
    const res = await fetch("/api/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deletingExpenseId }),
    });

    setIsDeleting(false);

    if (res.ok) {
      setShowDeleteConfirm(false);
      setDeletingExpenseId(null);
      fetchExpenses();
      showNotification("Expense deleted successfully", "success");
    }
  };

  const getExpenseTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      food: "from-orange-400 to-orange-600",
      electronics: "from-blue-400 to-blue-600",
      dress: "from-pink-400 to-pink-600",
      service: "from-indigo-400 to-indigo-600",
      gardening: "from-green-400 to-green-600",
      furniture: "from-amber-400 to-amber-600",
      "house utility": "from-cyan-400 to-cyan-600",
      footwear: "from-purple-400 to-purple-600",
      "makeup/grooming": "from-rose-400 to-rose-600",
      subscriptions: "from-teal-400 to-teal-600",
      "toy/figures/stationary": "from-yellow-400 to-yellow-600",
      "travel expenses": "from-sky-400 to-sky-600",
      gifts: "from-fuchsia-400 to-fuchsia-600",
    };
    return colors[type] || "from-gray-400 to-gray-600";
  };


  return (
    <>
    <Navbar />
    <div className="min-h-screen pt-24 pb-12 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <div className="px-6 lg:px-12 3xl:px-60 mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Track and manage your expenses</p>
          </div>
          <Link
            href="/add-expenses"
            className="bg-gradient-to-r cursor-pointer from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hidden md:block"
          >
            + Add Expense
          </Link>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="px-6 lg:px-12 3xl:px-60 cursor-pointer ">
        <DateRangeFilter onRangeChange={handleDateRangeChange} />
      </div>

      {/* Stats Cards */}
      <div className="px-6 lg:px-12 3xl:px-60 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 cursor-pointer ">
        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Total Spent (All Time)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">₹ {totalSpent.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faWallet} className="text-white w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{dateRange.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">₹ {filteredSpent.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faCalendarDays} className="text-white w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/20 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">Entries in Range</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredExpenses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <FontAwesomeIcon icon={faEye} className="text-white w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 lg:px-12 3xl:px-60">
        <div className="glass rounded-2xl py-6 px-4  backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FontAwesomeIcon icon={faChartPie} className="text-purple-600 w-6 h-6" />
              Expenses ({dateRange.label})
            </h2>
            <Link
              href="/add-expenses"
              className="md:hidden bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg text-sm"
            >
              Add
            </Link>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                <FontAwesomeIcon icon={faChartPie} className="text-gray-400 w-10 h-10" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No expenses in this range</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">Try selecting a different date range or add new expenses</p>
              <Link
                href="/add-expenses"
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-2 px-6 rounded-lg inline-block hover:shadow-lg transition-all"
              >
                Add Expense
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Description</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white">Mode</th>
                      <th className="text-right py-4 px-4 font-semibold text-gray-900 dark:text-white">Amount</th>
                      <th className="text-center py-4 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((exp, idx) => (
                        <tr
                          key={exp._id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="text-gray-900 dark:text-white font-medium">
                              {new Date(exp.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-700 dark:text-gray-300">{exp.description}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white bg-gradient-to-r ${getExpenseTypeColor(exp.type)}`}>
                              {exp.type}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${exp.mode === "cash"
                                  ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200"
                                  : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                                }`}
                            >
                              {exp.mode.charAt(0).toUpperCase() + exp.mode.slice(1)}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="font-bold text-gray-900 dark:text-white text-lg">
                              ₹ {exp.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex justify-center gap-3">
                              <button
                                onClick={() => setEditingExpense(exp)}
                                className="p-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                title="Edit"
                              >
                                <FontAwesomeIcon icon={faPen} className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(exp._id)}
                                className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                title="Delete"
                              >
                                <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE)}
                onPageChange={setCurrentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredExpenses.length}
              />
            </>
          )}
        </div>
      </div>

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
          onUpdated={fetchExpenses}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmationModal
          title="Delete Expense?"
          message="Are you sure you want to delete this expense? This action cannot be undone."
          confirmText="Yes, Delete"
          cancelText="No, Cancel"
          isLoading={isDeleting}
          isDangerous={true}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setDeletingExpenseId(null);
          }}
        />
      )}
    </div>
    </>
  );
}
