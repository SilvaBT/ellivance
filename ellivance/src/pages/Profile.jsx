import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../hooks/useAuth.jsx';
import Navbar from '../components/Navbar.jsx';
import ImageUploader from '../components/ImageUploader.jsx';

export default function Profile() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await supabase.from('profiles').update({ full_name: fullName, bio, avatar_url: avatarUrl }).eq('id', profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  if (!profile) return null;

  return (
    <>
      <Navbar />
      <div className="page page--narrow stack">
        <div>
          <p className="eyebrow">Your profile</p>
          <h1>Edit profile</h1>
        </div>
        <form className="card stack" onSubmit={handleSave}>
          <ImageUploader bucket="avatars" value={avatarUrl} onChange={setAvatarUrl} label="Avatar" />
          <div className="field">
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A little about you or your organisation" />
          </div>
          {saved && <p className="success-text">Saved.</p>}
          <button className="btn btn--primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </form>
      </div>
    </>
  );
}
