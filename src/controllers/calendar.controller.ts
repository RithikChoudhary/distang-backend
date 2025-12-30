import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ImportantDate } from '../models/ImportantDate.model';

/**
 * Add important date
 */
export const addImportantDate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { title, description, date, emoji, isRecurring, reminderEnabled } = req.body;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    if (!user.coupleId) {
      res.status(400).json({ success: false, message: 'You must be in a relationship.' });
      return;
    }
    
    if (!title || !date) {
      res.status(400).json({ success: false, message: 'Title and date are required.' });
      return;
    }
    
    const importantDate = new ImportantDate({
      coupleId: user.coupleId,
      createdBy: user._id,
      title: title.trim(),
      description: description?.trim(),
      date: new Date(date),
      emoji: emoji || '❤️',
      isRecurring: isRecurring || false,
      reminderEnabled: reminderEnabled !== false,
    });
    
    await importantDate.save();
    
    res.status(201).json({
      success: true,
      message: 'Important date added!',
      data: { date: importantDate },
    });
  } catch (error) {
    console.error('Add important date error:', error);
    res.status(500).json({ success: false, message: 'Failed to add date.' });
  }
};

/**
 * Get all important dates
 */
export const getImportantDates = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    if (!user.coupleId) {
      res.status(200).json({ success: true, data: { dates: [] } });
      return;
    }
    
    const dates = await ImportantDate.find({ coupleId: user.coupleId })
      .sort({ date: 1 })
      .populate('createdBy', 'uniqueId name');
    
    // Get upcoming dates (next 30 days)
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const upcoming = dates.filter(d => {
      const dateObj = new Date(d.date);
      if (d.isRecurring) {
        // For recurring, check if the day/month falls within next 30 days
        const thisYear = new Date(now.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const nextYear = new Date(now.getFullYear() + 1, dateObj.getMonth(), dateObj.getDate());
        return (thisYear >= now && thisYear <= thirtyDaysLater) || 
               (nextYear >= now && nextYear <= thirtyDaysLater);
      }
      return dateObj >= now && dateObj <= thirtyDaysLater;
    });
    
    res.status(200).json({
      success: true,
      data: {
        dates: dates.map(d => ({
          id: d._id,
          title: d.title,
          description: d.description,
          date: d.date,
          emoji: d.emoji,
          isRecurring: d.isRecurring,
          reminderEnabled: d.reminderEnabled,
          createdBy: d.createdBy,
        })),
        upcoming: upcoming.map(d => ({
          id: d._id,
          title: d.title,
          date: d.date,
          emoji: d.emoji,
        })),
      },
    });
  } catch (error) {
    console.error('Get important dates error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dates.' });
  }
};

/**
 * Delete important date
 */
export const deleteImportantDate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    const { dateId } = req.params;
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }
    
    const date = await ImportantDate.findById(dateId);
    
    if (!date) {
      res.status(404).json({ success: false, message: 'Date not found.' });
      return;
    }
    
    if (date.coupleId.toString() !== user.coupleId?.toString()) {
      res.status(403).json({ success: false, message: 'Not authorized.' });
      return;
    }
    
    await ImportantDate.findByIdAndDelete(dateId);
    
    res.status(200).json({
      success: true,
      message: 'Date deleted.',
    });
  } catch (error) {
    console.error('Delete important date error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete date.' });
  }
};

