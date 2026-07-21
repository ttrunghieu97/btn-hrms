// Widget self-registration barrel.
// Importing this file triggers registerWidget() calls in every widget component,
// populating the frontend widget registry before any dashboard renders.
// Must be imported by any page that renders dashboard widgets.

import './employee-status-chart';
import './department-headcount-chart';
import './hires-leavers-chart';
import './attendance-today-card';
import './attendance-exceptions-list';
import './pending-leave-list';
import './pending-approvals-list';
import './payroll-cost-trend-chart';
