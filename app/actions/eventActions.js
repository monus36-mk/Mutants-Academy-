'use server';

import dbConnect from '@/lib/db';
import Event from '@/models/Event';
import Fighter from '@/models/Fighter';
import { getCurrentUser } from '@/app/actions/authActions';
import { revalidatePath } from 'next/cache';

export async function getEvents() {
  try {
    await dbConnect();
    const events = await Event.find({})
      .populate({
        path: 'comments.fighter',
        select: 'name',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'comments.user',
        select: 'name role',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'rsvps',
        select: 'name style experienceLevel',
        options: { strictPopulate: false }
      })
      .populate({
        path: 'likes',
        select: 'name style experienceLevel',
        options: { strictPopulate: false }
      })
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    return {
      success: true,
      events: events.map((e) => ({
        ...e,
        _id: e._id.toString(),
        date: e.date.toISOString(),
        rsvps: e.rsvps ? e.rsvps.map((f) => (f._id ? f._id.toString() : f.toString())) : [],
        likes: e.likes ? e.likes.map((f) => (f._id ? f._id.toString() : f.toString())) : [],
        joinedFighters: e.rsvps ? e.rsvps.map((f) => ({
          _id: f._id ? f._id.toString() : f.toString(),
          name: f.name || 'Unknown Fighter',
          style: f.style || 'MMA',
          experienceLevel: f.experienceLevel || 'Beginner'
        })) : [],
        likedFighters: e.likes ? e.likes.map((f) => ({
          _id: f._id ? f._id.toString() : f.toString(),
          name: f.name || 'Unknown Fighter',
          style: f.style || 'MMA',
          experienceLevel: f.experienceLevel || 'Beginner'
        })) : [],
        comments: e.comments ? e.comments.map((c) => {
          let name = 'Unknown';
          let role = 'Athlete';

          if (c.fighter) {
            name = c.fighter.name || c.authorName || 'Unknown Athlete';
            role = c.authorRole || 'Athlete';
          } else if (c.user) {
            name = c.user.name || c.authorName || 'Master Admin';
            role = c.user.role === 'MainAdmin' ? 'Admin' : (c.user.role === 'Coach' ? 'Coach' : (c.authorRole || 'Admin'));
          } else {
            name = c.authorName || 'Unknown';
            role = c.authorRole || 'Athlete';
          }

          return {
            _id: c._id.toString(),
            text: c.text,
            createdAt: c.createdAt ? c.createdAt.toISOString() : null,
            fighterId: c.fighter ? (c.fighter._id ? c.fighter._id.toString() : c.fighter.toString()) : (c.user ? (c.user._id ? c.user._id.toString() : c.user.toString()) : null),
            fighterName: name,
            fighterRole: role,
          };
        }) : [],
        createdAt: e.createdAt ? e.createdAt.toISOString() : null,
        updatedAt: e.updatedAt ? e.updatedAt.toISOString() : null,
      })),
    };
  } catch (err) {
    console.error('Error fetching events:', err);
    return { error: 'Failed to fetch events' };
  }
}

export async function createEvent(prevState, formData) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const dateStr = formData.get('date');
    const location = formData.get('location')?.trim();
    const category = formData.get('category');
    const image = formData.get('image');
    const audio = formData.get('audio');
    const titleColor = formData.get('titleColor') || 'default';

    if (!title || !description || !dateStr || !category) {
      return { error: 'Please fill in all required fields.' };
    }

    console.log('--- server actions: createEvent ---');
    console.log('title:', title);
    console.log('titleColor:', titleColor);
    console.log('image size (chars):', image ? image.length : 0);
    console.log('audio size (chars):', audio ? audio.length : 0);

    await Event.create({
      title,
      description,
      date: new Date(dateStr),
      location,
      category,
      rsvps: [],
      image: image || undefined,
      audio: audio || undefined,
      titleColor,
    });

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error creating event:', err);
    return { error: 'Failed to create event.' };
  }
}

export async function deleteEvent(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    await Event.findByIdAndDelete(eventId);

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error deleting event:', err);
    return { error: 'Failed to delete event.' };
  }
}

export async function toggleEventRSVP(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized. Only athletes can RSVP.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    const fighterId = user.id;
    const hasRSVP = event.rsvps.some((id) => id.toString() === fighterId);

    if (hasRSVP) {
      // Remove RSVP
      event.rsvps = event.rsvps.filter((id) => id.toString() !== fighterId);
    } else {
      // Add RSVP
      event.rsvps.push(fighterId);
    }

    await event.save();

    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error toggling RSVP:', err);
    return { error: 'Failed to update RSVP.' };
  }
}

export async function toggleEventLike(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || user.role !== 'Fighter') {
      return { error: 'Unauthorized' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    const fighterId = user.id;
    const hasLiked = event.likes.some((id) => id.toString() === fighterId);

    if (hasLiked) {
      event.likes = event.likes.filter((id) => id.toString() !== fighterId);
    } else {
      event.likes.push(fighterId);
    }

    await event.save();

    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error toggling like:', err);
    return { error: 'Failed to update like.' };
  }
}

export async function addEventComment(eventId, text) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user) {
      return { error: 'Unauthorized' };
    }

    if (!text || text.trim() === '') {
      return { error: 'Comment text cannot be empty.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    const commentDoc = {
      text: text.trim(),
    };

    if (user.role === 'Fighter') {
      commentDoc.fighter = user.id;
      commentDoc.authorName = user.name;
      commentDoc.authorRole = 'Athlete';
    } else {
      commentDoc.user = user.id;
      commentDoc.authorName = user.name;
      commentDoc.authorRole = user.role === 'MainAdmin' ? 'Admin' : 'Coach';
    }

    event.comments.push(commentDoc);
    await event.save();

    revalidatePath('/fighter');
    revalidatePath('/admin/events');
    return { success: true };
  } catch (err) {
    console.error('Error adding comment:', err);
    return { error: 'Failed to post comment.' };
  }
}

export async function updateEvent(eventId, formData) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const title = formData.get('title')?.trim();
    const description = formData.get('description')?.trim();
    const dateStr = formData.get('date');
    const location = formData.get('location')?.trim();
    const category = formData.get('category');
    const image = formData.get('image');
    const audio = formData.get('audio');
    const titleColor = formData.get('titleColor') || 'default';

    if (!title || !description || !dateStr || !category) {
      return { error: 'Please fill in all required fields.' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    event.title = title;
    event.description = description;
    event.date = new Date(dateStr);
    event.location = location;
    event.category = category;
    event.titleColor = titleColor;
    
    // Only update if provided or explicitly cleared
    event.image = image || undefined;
    event.audio = audio || undefined;

    await event.save();

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error updating event:', err);
    return { error: 'Failed to update event.' };
  }
}

export async function toggleEventPin(eventId) {
  try {
    await dbConnect();

    const user = await getCurrentUser();
    if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
      return { error: 'Unauthorized' };
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return { error: 'Event not found.' };
    }

    event.pinned = !event.pinned;
    await event.save();

    revalidatePath('/admin/events');
    revalidatePath('/fighter');
    return { success: true };
  } catch (err) {
    console.error('Error toggling pin:', err);
    return { error: 'Failed to update event pin status.' };
  }
}
