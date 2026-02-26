'use client'

import { useState, useEffect } from 'react'
import { Plus, Pin, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { createSupabaseClient } from '@/lib/supabase/client'
import { QuickNote } from '@/lib/supabase/types'

/**
 * QuickNotes Component
 * 
 * Floating "+" button that opens a modal for quick notes:
 * - Textarea for content
 * - Tag input (comma-separated)
 * - Pin checkbox
 * - Saves to quick_notes table
 * - Displays recent notes
 */
export function QuickNotes() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [pinned, setPinned] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [notes, setNotes] = useState<QuickNote[]>([])
  const supabase = createSupabaseClient()

  useEffect(() => {
    loadNotes()
  }, [])

  const loadNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setNotes(data || [])
    } catch (error) {
      console.error('Error loading notes:', error)
    }
  }

  const handleSave = async () => {
    if (!content.trim()) {
      alert('Please enter note content')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      const { error } = await supabase
        .from('quick_notes')
        .insert({
          user_id: user.id,
          content: content.trim(),
          tags: tagArray,
          pinned,
        })

      if (error) throw error

      // Reset form
      setContent('')
      setTags('')
      setPinned(false)
      setIsModalOpen(false)
      await loadNotes()
    } catch (error) {
      console.error('Error saving note:', error)
      alert('Failed to save note. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return

    try {
      const { error } = await supabase
        .from('quick_notes')
        .delete()
        .eq('id', noteId)

      if (error) throw error
      await loadNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
      alert('Failed to delete note.')
    }
  }

  return (
    <>
      {/* Floating Add Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all flex items-center justify-center z-50"
        aria-label="Add note"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No notes yet. Click the + button to add one!
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${
                    note.pinned ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {note.pinned && (
                        <Pin className="h-4 w-4 text-yellow-600 mb-1" />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete note"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Note Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogClose onClose={() => setIsModalOpen(false)} />
          <DialogHeader>
            <DialogTitle>Add Quick Note</DialogTitle>
            <DialogDescription>
              Capture a quick thought or reminder
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-content">Content</Label>
              <textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Write your note here..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="note-tags">Tags (comma-separated)</Label>
              <Input
                id="note-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="work, personal, reminder"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="note-pinned"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="note-pinned" className="cursor-pointer">
                Pin this note
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
                {isSaving ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
