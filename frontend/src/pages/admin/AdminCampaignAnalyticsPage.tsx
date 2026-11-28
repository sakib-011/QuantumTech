import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { CampaignAnalyticsEvent } from '../../types';
import { promotionService } from '../../services/promotionService';
import { formatCurrency } from '../../utilities/currency';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { Icons } from '../../utilities/icons';
import { isBackendConnected, refreshAdminPromotions, reportBackendError } from '../../services/backend';

export const AdminCampaignAnalyticsPage: React.FC = () => {
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [summary, setSummary] = useState(() => promotionService.getAnalyticsSummary());
  const [events, setEvents] = useState<CampaignAnalyticsEvent[]>(() =>
    promotionService.getAnalyticsEvents().slice(-50).reverse()
  );

  const loadData = () => {
    setSummary(promotionService.getAnalyticsSummary());
    setEvents(promotionService.getAnalyticsEvents().slice(-50).reverse());
  };

  const refreshFromServer = async () => {
    if (isBackendConnected()) {
      try {
        await refreshAdminPromotions();
      } catch (error) {
        reportBackendError(error);
      }
    }
    loadData();
  };

  useEffect(() => {
    void refreshFromServer();
    const handleSync = () => loadData();
    window.addEventListener('quantum_analytics_updated', handleSync);
    return () => window.removeEventListener('quantum_analytics_updated', handleSync);
  }, []);

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to clear promotional analytics history?')) {
      try {
        await promotionService.clearAnalytics();
        showToast('Analytics logs reset.', 'info');
        loadData();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to reset analytics logs.', 'error');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Promotional Campaign Analytics</h1>
          <p className="text-sm text-muted mt-1">
            Real-time performance metrics for popups, festival campaigns, coupon redemptions, and promo sales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshFromServer()}
            className="btn-base px-3.5 py-2 rounded-xl border border-border bg-surface text-ink hover:bg-surface-alt text-xs font-semibold shadow-xs flex items-center gap-1.5"
          >
            <FontAwesomeIcon icon={Icons.refresh} className="h-3 w-3" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-base px-3.5 py-2 rounded-xl border border-error/30 text-error hover:bg-error-soft/30 text-xs font-semibold shadow-xs"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Impressions */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="caption-4 uppercase font-semibold tracking-wider">Popup Impressions</span>
            <FontAwesomeIcon icon={Icons.popup} className="h-4 w-4 text-quantum" />
          </div>
          <div className="heading-4 font-bold text-ink">{summary.impressions}</div>
          <p className="caption-5 text-muted mt-1">Delivered to shoppers</p>
        </div>

        {/* Clicks & CTR */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="caption-4 uppercase font-semibold tracking-wider">Popup Clicks / CTR</span>
            <FontAwesomeIcon icon={Icons.chart} className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="heading-4 font-bold text-ink">
            {summary.clicks} <span className="text-sm text-emerald-600 font-semibold">({summary.ctr}%)</span>
          </div>
          <p className="caption-5 text-muted mt-1">{summary.closes} dismissed</p>
        </div>

        {/* Coupons Applied */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="caption-4 uppercase font-semibold tracking-wider">Coupons Applied</span>
            <FontAwesomeIcon icon={Icons.coupon} className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="heading-4 font-bold text-ink">{summary.couponsUsed}</div>
          <p className="caption-5 text-muted mt-1">{summary.campaignVisits} campaign landing visits</p>
        </div>

        {/* Promotional Sales */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="caption-4 uppercase font-semibold tracking-wider">Promotional Revenue</span>
            <FontAwesomeIcon icon={Icons.dollar} className="h-4 w-4 text-quantum" />
          </div>
          <div className="heading-4 font-bold text-quantum">
            {formatCurrency(summary.totalRevenue, language)}
          </div>
          <p className="caption-5 text-muted mt-1">
            {summary.orders} orders completed
          </p>
        </div>
      </div>

      {/* Real Performance Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Traffic & Product Engagement */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
          <h2 className="title-3 font-bold text-ink mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={Icons.campaign} className="h-4 w-4 text-quantum" />
            <span>Campaign Engagement Breakdown</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Popup Click-Through Rate</span>
                <span>{summary.ctr}%</span>
              </div>
              <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.ctr)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Popup Dismissal / Close Rate</span>
                <span>{summary.closeRate}%</span>
              </div>
              <div className="w-full bg-surface-alt h-2 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.closeRate)}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-surface-alt rounded-xl">
                <div className="caption-5 text-muted uppercase font-semibold">Product Deal Clicks</div>
                <div className="text-lg font-bold text-ink mt-0.5">{summary.productClicks}</div>
              </div>
              <div className="p-3 bg-surface-alt rounded-xl">
                <div className="caption-5 text-muted uppercase font-semibold">Orders Completed</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">{summary.orders}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Event Stream */}
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col">
          <h2 className="title-3 font-bold text-ink mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FontAwesomeIcon icon={Icons.analytics} className="h-4 w-4 text-quantum" />
              <span>Recent Activity Feed</span>
            </span>
            <span className="caption-4 text-muted font-normal">{events.length} events logged</span>
          </h2>

          <div className="flex-1 max-h-80 overflow-y-auto divide-y divide-border text-xs">
            {events.length === 0 ? (
              <div className="p-8 text-center text-muted">
                No promotional events logged yet. As shoppers view popups, enter campaigns, or apply coupons, events
                will appear here.
              </div>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-semibold text-ink capitalize">
                      {ev.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-muted block text-[11px] truncate">
                      {ev.couponCode ? `Code: ${ev.couponCode} ` : ''}
                      {ev.popupId ? `Popup: ${ev.popupId} ` : ''}
                      {ev.campaignId ? `Campaign: ${ev.campaignId} ` : ''}
                      {ev.orderNumber ? `Order: ${ev.orderNumber} ` : ''}
                      {ev.revenue ? `৳${ev.revenue}` : ''}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted whitespace-nowrap">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
