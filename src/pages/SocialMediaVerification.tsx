import React, { useState, useEffect } from 'react';
import { PageContainer, PageHeader } from '../components/ui-redesign/PageLayouts';
import { SearchBar } from '../components/ui-redesign/Interactive';
import { InfoCard, LoadingState, EmptyState } from '../components/ui-redesign/Cards';
import { MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiService from '../services/apiService';
import { toast } from 'sonner';

export function SocialMediaVerification() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await apiService.getSocialMediaPosts();
        if (response.success && response.posts) {
          setPosts(response.posts.filter((p: any) => !p.verified));
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleVerify = async (postId: string, approved: boolean) => {
    try {
      await apiService.verifySocialMediaPost(postId, approved);
      toast.success(approved ? 'Post approved' : 'Post rejected');
      setPosts(posts.filter(p => p.id !== postId));
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  const filteredPosts = posts.filter(post =>
    post.content?.toLowerCase().includes(search.toLowerCase())
  );

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
        title="Social Media Verification"
        subtitle="Review and verify social media posts"
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search posts..."
      />

      {filteredPosts.length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title="No pending posts"
          description="All posts have been verified"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 mt-6">
          {filteredPosts.map((post, i) => (
            <InfoCard
              key={post.id || i}
              title={post.author || 'User'}
              icon={MessageSquare}
              iconColor="#1DA1F2"
              index={i}
            >
              <div className="space-y-4 mt-4">
                <p className="text-sm text-gray-700">{post.content}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleVerify(post.id, true)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleVerify(post.id, false)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </InfoCard>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
