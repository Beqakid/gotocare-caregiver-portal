import React, { useState, useEffect } from 'react'

const API = 'https://gotocare-original.jjioji.workers.dev/api'
const MARKETING_VIEW_KEY = 'cgp_marketing_view'
type MarketingView = 'compose' | 'history'

function getSavedMarketingView(): MarketingView {
  try {
    const saved = localStorage.getItem(MARKETING_VIEW_KEY) as MarketingView | null
    if (saved === 'compose' || saved === 'history') return saved
  } catch {}
  return 'compose'
}

interface MetaPage {
  id: number
  page_id: string
  page_name: string
  ig_account_id: string | null
}

interface MetaPost {
  id: number
  page_id: string
  message: string
  fb_post_id: string | null
  ig_post_id: string | null
  status: string
  posted_at: string
}

interface MarketingTabProps {
  userEmail: string
}

export default function MarketingTab({ userEmail }: MarketingTabProps) {
  const [pages, setPages] = useState<MetaPage[]>([])
  const [posts, setPosts] = useState<MetaPost[]>([])
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [postText, setPostText] = useState('')
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('warm and professional')
  const [postToIG, setPostToIG] = useState(true)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [posting, setPosting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [view, setView] = useState<MarketingView>(getSavedMarketingView)

  const navigateToView = (nextView: MarketingView) => {
    setView(nextView)
    try { localStorage.setItem(MARKETING_VIEW_KEY, nextView) } catch {}
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!userEmail) return
    loadPages()
    loadPosts()
    // Handle OAuth return
    const params = new URLSearchParams(window.location.search)
    const meta = params.get('meta')
    if (meta === 'connected') { showToast('Facebook page connected! 🎉'); loadPages() }
    if (meta === 'denied') showToast('Connection cancelled', 'error')
    if (meta === 'error') showToast('Connection failed. Please try again.', 'error')
  }, [userEmail])

  const loadPages = async () => {
    try {
      const res = await fetch(`${API}/meta-pages?ownerEmail=${encodeURIComponent(userEmail)}`)
      const data = await res.json()
      if (data.success) {
        setPages(data.pages || [])
        if (data.pages?.length > 0 && !selectedPage) setSelectedPage(data.pages[0].page_id)
      }
    } catch {}
  }

  const loadPosts = async () => {
    try {
      const res = await fetch(`${API}/meta-posts?ownerEmail=${encodeURIComponent(userEmail)}`)
      const data = await res.json()
      if (data.success) setPosts(data.posts || [])
    } catch {}
  }

  const connectFacebook = async () => {
    try {
      const res = await fetch(`${API}/meta-oauth-start?ownerEmail=${encodeURIComponent(userEmail)}&ownerType=caregiver`)
      const data = await res.json()
      if (data.oauthUrl) window.location.href = data.oauthUrl
      else showToast('Failed to start connection', 'error')
    } catch {
      showToast('Failed to start connection', 'error')
    }
  }

  const generatePost = async () => {
    if (!topic.trim()) { showToast('Enter a topic first', 'error'); return }
    setGenerating(true)
    try {
      const res = await fetch(`${API}/meta-generate-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, ownerType: 'caregiver' })
      })
      const data = await res.json()
      if (data.success) setPostText(data.content)
      else showToast('AI generation failed', 'error')
    } catch {
      showToast('AI generation failed', 'error')
    }
    setGenerating(false)
  }

  const publishPost = async () => {
    if (!selectedPage) { showToast('Select a page first', 'error'); return }
    if (!postText.trim()) { showToast('Write or generate a post first', 'error'); return }
    setPosting(true)
    try {
      const res = await fetch(`${API}/meta-post`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerEmail: userEmail, pageId: selectedPage, message: postText, postToInstagram: postToIG })
      })
      const data = await res.json()
      if (data.success) {
        showToast(data.igPostId ? 'Posted to Facebook + Instagram! 🚀' : 'Posted to Facebook! 🚀')
        setPostText('')
        setTopic('')
        loadPosts()
        navigateToView('history')
      } else {
        showToast(data.error || 'Post failed', 'error')
      }
    } catch {
      showToast('Post failed', 'error')
    }
    setPosting(false)
  }

  const selectedPageData = pages.find(p => p.page_id === selectedPage)

  return (
    <div style={{ padding: '16px', minHeight: '100vh', background: '#0a0a1a' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'linear-gradient(135deg,#22C55E,#16A34A)' : 'linear-gradient(135deg,#EF4444,#DC2626)',
          color: '#fff', padding: '12px 24px', borderRadius: 50, fontWeight: 600,
          fontSize: 14, zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>Marketing Hub</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '4px 0 0' }}>
          Post to Facebook & Instagram — AI writes it for you
        </p>
      </div>

      {/* Connect Page Banner */}
      {pages.length === 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,92,255,0.2), rgba(74,144,226,0.2))',
          border: '1px solid rgba(124,92,255,0.4)',
          borderRadius: 16, padding: 24, marginBottom: 20, textAlign: 'center'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📱</div>
          <h3 style={{ color: '#fff', margin: '0 0 8px', fontSize: 18 }}>Connect your Facebook page</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
            Link your Facebook Business Page (and Instagram) to start auto-posting AI-generated content.
          </p>
          <button onClick={connectFacebook} style={{
            background: 'linear-gradient(135deg,#1877F2,#0d5bba)',
            color: '#fff', border: 'none', borderRadius: 50, padding: '14px 32px',
            fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Connect Facebook & Instagram
          </button>
        </div>
      )}

      {/* Connected Page Info */}
      {pages.length > 0 && (
        <div style={{
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>{selectedPageData?.page_name || 'Connected'}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                Facebook{selectedPageData?.ig_account_id ? ' + Instagram' : ''} connected
              </div>
            </div>
          </div>
          <button onClick={connectFacebook} style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer'
          }}>+ Add Page</button>
        </div>
      )}

      {/* Tab Switcher */}
      {pages.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 }}>
            {(['compose', 'history'] as const).map(v => (
              <button key={v} onClick={() => navigateToView(v)} style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: view === v ? 'linear-gradient(135deg,#7C5CFF,#4A90E2)' : 'transparent',
                color: view === v ? '#fff' : 'rgba(255,255,255,0.5)',
                fontWeight: view === v ? 700 : 400, fontSize: 14
              }}>{v === 'compose' ? '✍️ Compose' : '📋 History'}</button>
            ))}
          </div>

          {/* Compose View */}
          {view === 'compose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Page selector */}
              {pages.length > 1 && (
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6, display: 'block' }}>POST TO PAGE</label>
                  <select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} style={{
                    width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12, padding: '12px 16px', color: '#fff', fontSize: 15
                  }}>
                    {pages.map(p => <option key={p.page_id} value={p.page_id}>{p.page_name}</option>)}
                  </select>
                </div>
              )}

              {/* AI Generator */}
              <div style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.3)', borderRadius: 16, padding: 16 }}>
                <div style={{ color: '#7C5CFF', fontWeight: 700, fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✨ AI Post Generator
                </div>
                <input
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  placeholder="What's this post about? (e.g. 'availability for weekend shifts')"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 14,
                    marginBottom: 10, boxSizing: 'border-box'
                  }}
                />
                <select value={tone} onChange={e => setTone(e.target.value)} style={{
                  width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, marginBottom: 12
                }}>
                  <option value="warm and professional">Warm & Professional</option>
                  <option value="friendly and casual">Friendly & Casual</option>
                  <option value="urgent and action-oriented">Urgent & Action-Oriented</option>
                  <option value="empathetic and caring">Empathetic & Caring</option>
                </select>
                <button onClick={generatePost} disabled={generating} style={{
                  width: '100%', background: generating ? 'rgba(124,92,255,0.4)' : 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
                  color: '#fff', border: 'none', borderRadius: 10, padding: '12px',
                  fontSize: 14, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer'
                }}>
                  {generating ? '✨ Generating...' : '✨ Generate with AI'}
                </button>
              </div>

              {/* Post text editor */}
              <div>
                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 6, display: 'block' }}>YOUR POST</label>
                <textarea
                  value={postText}
                  onChange={e => setPostText(e.target.value)}
                  placeholder="Write your post here, or use AI to generate one above..."
                  rows={6}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12, padding: '14px 16px', color: '#fff', fontSize: 14,
                    resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6
                  }}
                />
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                  {postText.length} characters
                </div>
              </div>

              {/* Instagram toggle */}
              {selectedPageData?.ig_account_id && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px'
                }}>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Also post to Instagram</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Requires an image URL</div>
                  </div>
                  <div onClick={() => setPostToIG(!postToIG)} style={{
                    width: 48, height: 26, borderRadius: 13, cursor: 'pointer', transition: 'all 0.2s',
                    background: postToIG ? 'linear-gradient(135deg,#7C5CFF,#4A90E2)' : 'rgba(255,255,255,0.15)',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, left: postToIG ? 25 : 3,
                      width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 0.2s'
                    }} />
                  </div>
                </div>
              )}

              {/* Publish button */}
              <button onClick={publishPost} disabled={posting || !postText.trim()} style={{
                width: '100%', padding: '16px',
                background: posting || !postText.trim() ? 'rgba(124,92,255,0.3)' : 'linear-gradient(135deg,#7C5CFF,#4A90E2)',
                color: '#fff', border: 'none', borderRadius: 14, fontSize: 16,
                fontWeight: 700, cursor: posting || !postText.trim() ? 'not-allowed' : 'pointer',
                boxShadow: posting || !postText.trim() ? 'none' : '0 4px 20px rgba(124,92,255,0.4)'
              }}>
                {posting ? '📤 Publishing...' : '🚀 Publish Now'}
              </button>
            </div>
          )}

          {/* History View */}
          {view === 'history' && (
            <div>
              {posts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div>No posts yet. Compose your first one!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {posts.map(post => (
                    <div key={post.id} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14, padding: 16
                    }}>
                      <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
                        {post.message}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {post.fb_post_id && (
                          <span style={{ background: 'rgba(24,119,242,0.2)', color: '#60A5FA', fontSize: 11, padding: '4px 10px', borderRadius: 50, fontWeight: 600 }}>
                            ✓ Facebook
                          </span>
                        )}
                        {post.ig_post_id && (
                          <span style={{ background: 'rgba(225,48,108,0.2)', color: '#F472B6', fontSize: 11, padding: '4px 10px', borderRadius: 50, fontWeight: 600 }}>
                            ✓ Instagram
                          </span>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 'auto' }}>
                          {new Date(post.posted_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
