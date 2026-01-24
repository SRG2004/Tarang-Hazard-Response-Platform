import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar, Pagination } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { FileText, MapPin, Calendar, CheckCircle, XCircle, Clock, Sparkles, Brain, AlertTriangle } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';

// Helper functions for confidence score colors
function getConfidenceColorBg(confidence: number): string {
  if (confidence >= 0.8) return 'bg-green-500';
  if (confidence >= 0.6) return 'bg-yellow-500';
  if (confidence >= 0.4) return 'bg-orange-500';
  return 'bg-red-500';
}

function getConfidenceColorText(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-700';
  if (confidence >= 0.6) return 'text-yellow-700';
  if (confidence >= 0.4) return 'text-orange-700';
  return 'text-red-700';
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'verified') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">
        <CheckCircle className="w-3 h-3" /> Verified
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
        <XCircle className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
      <Clock className="w-3 h-3" /> Pending Review
    </span>
  );
}


function formatDate(dateValue: any) {
  if (!dateValue) return 'Unknown Date';
  // Handle Firestore Timestamp (has toDate method)
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate().toLocaleDateString();
  }
  // Handle standard Date object or valid date string/number
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  } catch (e) {
    return 'Invalid Date';
  }
}


export function ReportsManagement() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [groupByRegion, setGroupByRegion] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const reportsPerPage = 9;

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await apiService.getReports();
        if (response.success && response.reports) {
          setReports(response.reports);
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleVerify = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to verify this report?')) return;
    setProcessingId(reportId);
    try {
      // Assuming current user is authority - in real app, check role
      await apiService.verifyReport(reportId, 'authority_user', 'authority');
      toast.success('Report verified successfully');
      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'verified' } : r));
    } catch (error) {
      console.error('Verify error:', error);
      toast.error('Failed to verify report');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reportId: string) => {
    const reason = window.prompt('Enter rejection reason (optional):');
    if (reason === null) return; // Cancelled

    setProcessingId(reportId);
    try {
      await apiService.rejectReport(reportId, 'authority_user', 'authority', reason || undefined);
      toast.success('Report rejected');
      // Update local state
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'rejected' } : r));
    } catch (error) {
      console.error('Reject error:', error);
      toast.error('Failed to reject report');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredReports = reports.filter(report => {
    // 1. Search Filter
    const matchesSearch = report.title?.toLowerCase().includes(search.toLowerCase()) ||
      report.location?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Rejected Report Retention Logic (Show only if rejected < 1 hour ago)
    if (report.status === 'rejected') {
      const rejectionTime = report.rejectedAt ? new Date(report.rejectedAt).getTime() :
        (report.updatedAt ? new Date(report.updatedAt).getTime() : 0);

      const oneHour = 60 * 60 * 1000;
      const timeSinceRejection = Date.now() - rejectionTime;

      // If rejected more than 1 hour ago, hide it
      if (timeSinceRejection > oneHour) return false;
    }

    return true;
  });

  // Regional Grouping Logic
  const processedReports = groupByRegion ? groupReportsByRegion(filteredReports) : filteredReports;

  const totalPages = Math.ceil(processedReports.length / reportsPerPage);
  const paginatedReports = processedReports.slice(
    (currentPage - 1) * reportsPerPage,
    currentPage * reportsPerPage
  );

  // Helper function to group reports by region (50km clusters) AND timeframe (24h)
  function groupReportsByRegion(reports: any[]) {
    const clusters: any[] = [];
    const CLUSTER_RADIUS = 50; // km
    const TIME_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    reports.forEach(report => {
      if (!report.latitude || !report.longitude || !report.submittedAt) {
        clusters.push({ ...report, isCluster: false });
        return;
      }

      const reportTime = new Date(report.submittedAt).getTime();

      // Find existing cluster within radius AND time window
      const existingCluster = clusters.find(cluster => {
        if (!cluster.isCluster || !cluster.latitude || !cluster.submittedAt) return false;

        const clusterTime = new Date(cluster.submittedAt).getTime();
        const timeDiff = Math.abs(reportTime - clusterTime);

        // Check both spatial AND temporal proximity
        if (timeDiff > TIME_WINDOW) return false;

        const distance = calculateDistance(
          report.latitude, report.longitude,
          cluster.latitude, cluster.longitude
        );
        return distance <= CLUSTER_RADIUS;
      });

      if (existingCluster) {
        existingCluster.reports.push(report);
        const timeRange = getTimeRange(existingCluster.reports);
        existingCluster.title = `${existingCluster.reports.length} reports near ${existingCluster.location} (${timeRange})`;
      } else {
        clusters.push({
          ...report,
          isCluster: true,
          reports: [report]
        });
      }
    });

    return clusters;
  }

  function getTimeRange(reports: any[]): string {
    if (reports.length === 1) return 'single event';

    const times = reports.map(r => new Date(r.submittedAt).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const hoursDiff = Math.round((maxTime - minTime) / (60 * 60 * 1000));

    if (hoursDiff < 1) return 'within 1 hour';
    if (hoursDiff === 1) return '1 hour span';
    return `${hoursDiff}h span`;
  }

  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  if (loading) {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports Management"
        subtitle="Review and manage hazard reports"
      />

      <div className="flex items-center justify-between mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search reports..."
        />

        <button
          onClick={() => setGroupByRegion(!groupByRegion)}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${groupByRegion
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
        >
          {groupByRegion ? '📍 Grouped by Region' : '📋 List View'}
        </button>
      </div>

      {paginatedReports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports found"
          description="Try adjusting your search"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {paginatedReports.map((report, i) => (

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={report.id || i}
              >
                <InfoCard
                  key={report.id || i}
                  title={report.title || 'Untitled Report'}
                  icon={FileText}
                  iconColor="#4F46E5"
                  index={i}
                >
                  {/* Report Image Display */}
                  {report.photoURL && (
                    <div className="mb-4 rounded-lg overflow-hidden h-48 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
                      <img
                        src={report.photoURL}
                        alt="Hazard Report"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    {report.location && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <span className="text-gray-600 dark:text-gray-400">{report.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatDate(report.createdAt || report.submittedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <StatusBadge status={report.status || 'pending'} />

                    {/* Action Buttons for Pending Reports */}
                    {report.status !== 'verified' && report.status !== 'rejected' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(report.id)}
                          disabled={processingId === report.id}
                          className="p-1.5 rounded-full bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                          title="Verify Report"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(report.id)}
                          disabled={processingId === report.id}
                          className="p-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                          title="Reject Report"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {report.severity && (
                    <span className={`inline-block px-2 py-1 text-xs rounded-full capitalize mt-2 ${report.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      report.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        report.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                      }`}>
                      {report.severity}
                    </span>
                  )}

                  {/* AI Analysis Section */}
                  {report.confidenceScore !== undefined && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            AI Confidence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm('Re-analyze this report with latest AI models?')) return;
                              setProcessingId(report.id);
                              try {
                                const result = await apiService.reanalyzeReport(report.id);
                                if (result.success && result.report) {
                                  toast.success('Report re-analyzed successfully');
                                  setReports(prev => prev.map(r => r.id === report.id ? { ...r, ...result.report } : r));
                                }
                              } catch (error) {
                                console.error('Re-analysis failed:', error);
                                toast.error('Failed to re-analyze report');
                              } finally {
                                setProcessingId(null);
                              }
                            }}
                            disabled={processingId === report.id}
                            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors"
                            title="Re-analyze with AI"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-refresh-cw ${processingId === report.id ? 'animate-spin' : ''}`}>
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                              <path d="M21 3v5h-5" />
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                              <path d="M3 21v-5h5" />
                            </svg>
                          </button>
                          <span className={`text-sm font-bold ${getConfidenceColorText(report.confidenceScore)}`}>
                            {Math.round(report.confidenceScore * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div className="w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getConfidenceColorBg(report.confidenceScore)}`}
                          style={{ width: `${report.confidenceScore * 100}%` }}
                        />
                      </div>

                      {/* Auto-rejection badge with reason */}
                      {report.autoRejected && (
                        <div className="mt-2 text-xs">
                          <div className="p-2 bg-orange-50 border border-orange-200 rounded flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                            <span className="text-orange-700 font-medium">Auto-rejected by AI</span>
                          </div>
                          {/* Fallback to generic message if no specific reason is found */}
                          <div className="text-gray-600 dark:text-gray-400 pl-1">
                            <span className="font-medium">Reason:</span> {
                              (report.aiAnalysis?.imageAnalysis?.confidence < 0.5 && (report.aiAnalysis?.imageAnalysis?.reasoning || report.aiAnalysis?.imageAnalysis?.error))
                                ? <span className="text-red-600 font-medium ml-1">
                                  Image Issue: {
                                    (report.aiAnalysis.imageAnalysis.error && typeof report.aiAnalysis.imageAnalysis.error === 'string' && report.aiAnalysis.imageAnalysis.error.includes('API key'))
                                      ? "AI Service Unavailable (Configuration Error)"
                                      : (report.aiAnalysis.imageAnalysis.reasoning || report.aiAnalysis.imageAnalysis.error)
                                  }
                                </span>
                                : (report.aiAnalysis?.imageError)
                                  ? <span className="text-red-600 font-medium ml-1">Image Analysis Failed: {report.aiAnalysis.imageError}</span>
                                  : (report.aiAnalysis?.textAnalysis?.confidence < 0.5 && (report.aiAnalysis?.textAnalysis?.reasoning || report.aiAnalysis?.textAnalysis?.error))
                                    ? <span className="text-orange-600 font-medium ml-1">Text Issue: {report.aiAnalysis.textAnalysis.reasoning || report.aiAnalysis.textAnalysis.error}</span>
                                    : (report.aiAnalysis?.textError)
                                      ? <span className="text-orange-600 font-medium ml-1">Text Analysis Failed: {report.aiAnalysis.textError}</span>
                                      : report.rejectionReason || "Does not meet safety criteria."
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed AI Analysis Accordion */}
                  {report.aiAnalysis && (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        <span>View AI Analysis Details</span>
                      </summary>

                      <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded space-y-2">
                        {/* Image Analysis */}
                        {report.aiAnalysis.imageAnalysis && (
                          <div className="text-xs">
                            <p className="font-semibold text-purple-900 dark:text-purple-300 mb-1">Image Analysis:</p>
                            <p className="text-gray-700 dark:text-gray-300">
                              {report.aiAnalysis.imageAnalysis.description ||
                                report.aiAnalysis.imageAnalysis.reasoning ||
                                report.aiAnalysis.imageAnalysis.error ||
                                "No details available."}
                            </p>
                            {report.aiAnalysis.imageAnalysis.hazardType && (
                              <p className="mt-1">
                                <span className="font-medium dark:text-gray-200">Detected:</span> {report.aiAnalysis.imageAnalysis.hazardType}
                                {report.aiAnalysis.imageAnalysis.severity && ` (${report.aiAnalysis.imageAnalysis.severity})`}
                              </p>
                            )}

                            {/* AI-Generated Warning */}
                            {report.aiAnalysis.imageAnalysis.isAiGenerated && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded">
                                <AlertTriangle className="w-4 h-4 inline text-red-600 mr-1" />
                                <span className="text-red-800 font-semibold">
                                  AI-Generated Image ({Math.round((report.aiAnalysis.imageAnalysis.aiGenConfidence || 0) * 100)}%)
                                </span>
                                {report.aiAnalysis.imageAnalysis.manipulationDetails && (
                                  <p className="text-red-700 text-xs mt-1">{report.aiAnalysis.imageAnalysis.manipulationDetails}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Text Analysis */}
                        {report.aiAnalysis.textAnalysis && (
                          <div className="text-xs">
                            <p className="font-semibold text-purple-900 dark:text-purple-300 mb-1">Text Analysis:</p>
                            <p className="text-gray-700 dark:text-gray-300">{report.aiAnalysis.textAnalysis.reasoning || report.aiAnalysis.textAnalysis.summary}</p>
                            {report.aiAnalysis.textAnalysis.hazardType && (
                              <p className="mt-1 dark:text-gray-300">
                                <span className="font-medium">Type:</span> {report.aiAnalysis.textAnalysis.hazardType}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Contextual Intelligence Display */}
                  {report.contextualData && (
                    <div className="mt-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center gap-2">
                        🔍 Contextual Verification
                        <span className="ml-auto text-xs font-semibold px-2 py-1 bg-blue-600 text-white rounded-full">
                          {Math.round((report.contextualData.contextScore || 0) * 100)}% Match
                        </span>
                      </h4>

                      {/* Weather Info */}
                      {report.contextualData.weather && (
                        <div className="mb-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">🌤️ Weather Conditions:</p>
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p>
                              <strong>{report.contextualData.weather.current.main}</strong> - {report.contextualData.weather.current.description}
                            </p>
                            <p>
                              Temp: {Math.round(report.contextualData.weather.current.temperature)}°C,
                              Wind: {report.contextualData.weather.current.windSpeed} m/s,
                              Humidity: {report.contextualData.weather.current.humidity}%
                            </p>
                            {report.contextualData.weather.isExtreme && (
                              <div className="mt-1 p-2 bg-red-100 border border-red-300 rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-red-600" />
                                <span className="text-red-800 font-semibold">⚠️ Extreme weather conditions detected</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Historical Matches */}
                      {report.contextualData.historicalMatches?.length > 0 && (
                        <div className="mb-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            📊 Similar Past Events: {report.contextualData.historicalMatches.length} found
                          </p>
                          <div className="space-y-1">
                            {report.contextualData.historicalMatches.slice(0, 2).map((match: any, idx: number) => (
                              <p key={idx} className="text-xs text-gray-600 dark:text-gray-400 pl-2">
                                • {match.title} ({match.distance}km away, {new Date(match.date).toLocaleDateString()})
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trusted News Articles */}
                      {report.contextualData.socialMediaEvidence?.newsArticles?.length > 0 && (
                        <div className="mb-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            📰 News Coverage: {report.contextualData.socialMediaEvidence.newsArticles.length} articles
                          </p>
                          <div className="space-y-2">
                            {report.contextualData.socialMediaEvidence.newsArticles.slice(0, 2).map((article: any, idx: number) => (
                              <div key={idx} className="p-2 bg-gray-50 dark:bg-slate-700 rounded">
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                  {article.title}
                                </a>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{article.snippet}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <span className="text-xs text-gray-400">{article.source}</span>
                                  {article.isTrustedSource && (
                                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded">✓ Trusted</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Viral Social Posts */}
                      {report.contextualData.socialMediaEvidence?.viralPosts?.length > 0 && (
                        <div className="mb-3 p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            🔥 Viral Posts: {report.contextualData.socialMediaEvidence.viralPosts.length} found
                          </p>
                          <div className="space-y-2">
                            {report.contextualData.socialMediaEvidence.viralPosts.slice(0, 2).map((post: any, idx: number) => (
                              <div key={idx} className="p-2 bg-gray-50 dark:bg-slate-700 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-300">{post.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-400">via {post.platform}</span>
                                  <span className="text-xs text-purple-600 dark:text-purple-400">👍 {post.engagement} engagement</span>
                                  {post.url && (
                                    <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 dark:text-blue-400 hover:underline">
                                      View →
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* YouTube Videos */}
                      {report.contextualData.socialMediaEvidence?.youtubeVideos?.length > 0 && (
                        <div className="p-2 bg-white dark:bg-slate-800 rounded border border-blue-100 dark:border-blue-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            🎥 YouTube: {report.contextualData.socialMediaEvidence.youtubeVideos.length} videos
                          </p>
                          <div className="space-y-1">
                            {report.contextualData.socialMediaEvidence.youtubeVideos.slice(0, 2).map((video: any, idx: number) => (
                              <a
                                key={idx}
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                • {video.title} ({video.channel})
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </InfoCard>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}
    </PageContainer>
  );
}
