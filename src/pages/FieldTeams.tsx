import { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { InfoCard, LoadingState } from '../components/ui-redesign/Cards';
import { Users, Truck, Clock, MapPin, Plus, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface Volunteer {
    id: string;
    name: string;
    skills: string[];
    status: string;
}

interface Team {
    id: string;
    name: string;
    type: string;
    leaderId: string;
    leaderName?: string;
    leaderPhone?: string;
    memberCount?: number;
    memberIds: string[];
    status: 'ready' | 'deployed' | 'resting';
    currentAssignmentId?: string;
}

interface Deployment {
    id: string;
    teamId: string;
    targetReportId: string;
    instructions: string;
    status: string;
    startTime: any;
}

interface Report {
    id: string;
    title: string;
    location: string;
    status: string;
}

export function FieldTeams() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'teams' | 'deployments'>('teams');
    const [teams, setTeams] = useState<Team[]>([]);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [activeReports, setActiveReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    // Forms
    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>('');

    const [newTeam, setNewTeam] = useState({
        name: '',
        type: 'general',
        leaderName: '',
        leaderPhone: '',
        memberCount: 1,
        members: [] as string[]
    });

    const [newDeployment, setNewDeployment] = useState({
        teamId: '',
        reportId: '',
        instructions: '',
        duration: 4
    });

    useEffect(() => {
        if (currentUser) {
            const unsubscribeTeams = onSnapshot(
                query(collection(db, 'fieldTeams'), where('ngoId', '==', currentUser.uid)),
                (snapshot) => {
                    setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)));
                    setLoading(false);
                },
                (error) => {
                    console.error('Error in teams snapshot:', error);
                    toast.error('Failed to load teams');
                    setLoading(false);
                }
            );

            const unsubscribeDeployments = onSnapshot(
                query(collection(db, 'deployments'), where('ngoId', '==', currentUser.uid)),
                (snapshot) => {
                    setDeployments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Deployment)));
                },
                (error) => {
                    console.error('Error in deployments snapshot:', error);
                }
            );

            fetchVolunteers();
            fetchActiveReports();

            return () => {
                unsubscribeTeams();
                unsubscribeDeployments();
            };
        } else {
            setLoading(false);
        }
    }, [currentUser]);

    const fetchVolunteers = async () => {
        // For demo, fetching all volunteers. In real app, filter by NGO affiliation
        const q = query(collection(db, 'volunteers'));
        const snapshot = await getDocs(q);
        setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer)));
    };

    const fetchActiveReports = async () => {
        // Fetch all reports that can be assigned to teams (including pending, verified, in-progress)
        const q = query(collection(db, 'reports'), where('status', 'in', ['pending', 'verified', 'in-progress']));
        const snapshot = await getDocs(q);
        setActiveReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    };

    const handleCreateTeam = async () => {
        if (!newTeam.name || !newTeam.leaderName || !newTeam.leaderPhone) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            await addDoc(collection(db, 'fieldTeams'), {
                name: newTeam.name,
                type: newTeam.type,
                leaderName: newTeam.leaderName,
                leaderPhone: newTeam.leaderPhone,
                memberCount: newTeam.memberCount,
                leaderId: '', // Empty for text-based leaders
                ngoId: currentUser?.uid,
                status: 'ready',
                memberIds: newTeam.members,
                createdAt: serverTimestamp()
            });
            toast.success('Team created successfully');
            setShowCreateTeam(false);
            setNewTeam({ name: '', type: 'general', leaderName: '', leaderPhone: '', memberCount: 1, members: [] });
        } catch (error) {
            console.error('Error creating team:', error);
            toast.error('Failed to create team');
        }
    };

    const handleDeploy = async () => {
        if (!newDeployment.teamId || !newDeployment.reportId) {
            toast.error('Please select a team and target');
            return;
        }

        try {
            // Create deployment record
            await addDoc(collection(db, 'deployments'), {
                ...newDeployment,
                ngoId: currentUser?.uid,
                status: 'en-route',
                startTime: serverTimestamp()
            });

            // Update team status
            await updateDoc(doc(db, 'fieldTeams', newDeployment.teamId), {
                status: 'deployed',
                currentAssignmentId: newDeployment.reportId
            });

            toast.success('Team deployed successfully');
            setShowDeployModal(false);
            setActiveTab('deployments');
            setNewDeployment({ teamId: '', reportId: '', instructions: '', duration: 4 });
        } catch (error) {
            console.error('Error deploying team:', error);
            toast.error('Failed to deploy team');
        }
    };

    if (loading) return <PageContainer><LoadingState /></PageContainer>;

    return (
        <PageContainer>
            <PageHeader
                title="Field Team Coordination"
                subtitle="Manage and deploy volunteer teams to incident sites"
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <InfoCard
                    title={teams.length.toString()}
                    subtitle="Total Teams"
                    icon={Users}
                    iconColor="#4F46E5"
                />
                <InfoCard
                    title={teams.filter(t => t.status === 'deployed').length.toString()}
                    subtitle="Currently Deployed"
                    icon={Truck}
                    iconColor="#F59E0B"
                />
                <InfoCard
                    title={deployments.filter(d => d.status === 'completed').length.toString()}
                    subtitle="Missions Completed"
                    icon={CheckCircle}
                    iconColor="#10B981"
                />
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6">
                <button
                    className={`px-6 py-3 font-medium ${activeTab === 'teams' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('teams')}
                >
                    Team Management
                </button>
                <button
                    className={`px-6 py-3 font-medium ${activeTab === 'deployments' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('deployments')}
                >
                    Active Deployments
                </button>
            </div>

            {activeTab === 'teams' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Available Teams</h3>
                        <button
                            onClick={() => setShowCreateTeam(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700"
                        >
                            <Plus className="w-5 h-5" />
                            Create Team
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white p-6 rounded-lg shadow-md border-l-4"
                                style={{ borderColor: team.status === 'deployed' ? '#F59E0B' : '#10B981' }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-lg">{team.name}</h4>
                                        <span className="text-sm text-gray-500 capitalize">{team.type} Unit</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${team.status === 'deployed' ? 'bg-yellow-100 text-yellow-800' :
                                        team.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-gray-100'
                                        }`}>
                                        {team.status}
                                    </span>
                                </div>

                                <p className="text-sm text-gray-600 mb-4">
                                    Members: {team.memberCount || team.memberIds.length || 0} | Leader: {team.leaderName || volunteers.find(v => v.id === team.leaderId)?.name || 'Unknown'}
                                    {team.leaderPhone && <span className="ml-2">📞 {team.leaderPhone}</span>}
                                </p>

                                {team.status === 'ready' && (
                                    <button
                                        onClick={() => {
                                            setNewDeployment({ ...newDeployment, teamId: team.id });
                                            setShowDeployModal(true);
                                        }}
                                        className="w-full py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 font-medium"
                                    >
                                        Deploy Team
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold mb-4">Deployment Status</h3>
                    {deployments.map(deployment => {
                        const team = teams.find(t => t.id === deployment.teamId);
                        const report = activeReports.find(r => r.id === deployment.targetReportId);

                        return (
                            <div key={deployment.id} className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-100 rounded-full">
                                        <Truck className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg">{team?.name || 'Unknown Team'}</h4>
                                        <p className="text-sm text-gray-600">
                                            Target: {report?.title || 'Unknown Location'} ({report?.location})
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                                        <Clock className="w-4 h-4" />
                                        <span>Deployed: {deployment.startTime?.toDate().toLocaleTimeString()}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium capitalize">
                                        {deployment.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {deployments.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            No active deployments
                        </div>
                    )}
                </div>
            )}

            {/* Create Team Modal */}
            {showCreateTeam && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Create New Team</h3>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Team Name"
                                className="w-full p-2 border rounded"
                                value={newTeam.name}
                                onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
                            />

                            <select
                                className="w-full p-2 border rounded"
                                value={newTeam.type}
                                onChange={e => setNewTeam({ ...newTeam, type: e.target.value })}
                            >
                                <option value="general">General Relief</option>
                                <option value="medical">Medical</option>
                                <option value="rescue">Search & Rescue</option>
                                <option value="logistics">Logistics</option>
                            </select>

                            <div>
                                <label className="block text-sm font-medium mb-1">Team Leader Name *</label>
                                <input
                                    type="text"
                                    placeholder="Enter leader name"
                                    className="w-full p-2 border rounded"
                                    value={newTeam.leaderName}
                                    onChange={e => setNewTeam({ ...newTeam, leaderName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Team Leader Phone *</label>
                                <input
                                    type="tel"
                                    placeholder="Enter phone number"
                                    className="w-full p-2 border rounded"
                                    value={newTeam.leaderPhone}
                                    onChange={e => setNewTeam({ ...newTeam, leaderPhone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Number of Members *</label>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="Enter number of team members"
                                    className="w-full p-2 border rounded"
                                    value={newTeam.memberCount}
                                    onChange={e => setNewTeam({ ...newTeam, memberCount: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowCreateTeam(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTeam}
                                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                            >
                                Create Team
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deploy Modal */}
            {showDeployModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Deploy Team</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Target Incident</label>
                                {activeReports.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic p-2 bg-gray-50 rounded">No active incidents available. Create hazard reports first.</p>
                                ) : (
                                    <select
                                        className="w-full p-2 border rounded"
                                        value={newDeployment.reportId}
                                        onChange={e => setNewDeployment({ ...newDeployment, reportId: e.target.value })}
                                    >
                                        <option value="">Select Incident...</option>
                                        {activeReports.map(r => (
                                            <option key={r.id} value={r.id}>{r.title || 'Untitled'} - {r.location || 'Unknown location'} ({r.status})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Instructions</label>
                                <textarea
                                    className="w-full p-2 border rounded"
                                    rows={3}
                                    placeholder="Specific actions required..."
                                    value={newDeployment.instructions}
                                    onChange={e => setNewDeployment({ ...newDeployment, instructions: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Duration (Hours)</label>
                                <input
                                    type="number"
                                    className="w-full p-2 border rounded"
                                    value={newDeployment.duration}
                                    onChange={e => setNewDeployment({ ...newDeployment, duration: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowDeployModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeploy}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Confirm Deployment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
