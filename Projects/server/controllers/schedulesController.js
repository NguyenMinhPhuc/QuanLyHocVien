const scheduleService = require('../services/scheduleService');

async function listSchedules(req, res) {
  try {
    const opts = {
      q: req.query.q,
      page: req.query.page || 1,
      pageSize: req.query.pageSize || 20,
      sortField: req.query.sortField,
      sortDir: req.query.sortDir,
      classId: req.query.classId,
      weekday: req.query.weekday
    };
    const result = await scheduleService.getSchedules(opts);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function getSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await scheduleService.getScheduleById(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function createSchedule(req, res) {
  try {
    const data = req.body;
    // require explicit schedule_date when creating
    if (!data || !data.schedule_date) return res.status(400).json({ error: 'schedule_date is required' });
    // support recurrence: client may send `weekdays` array (ignored when schedule_date present)
    if (Array.isArray(data.weekdays) && data.weekdays.length > 0) {
      const createdRows = [];
      for (const wd of data.weekdays) {
        const payload = { class_id: data.class_id, weekday: wd, start_time: data.start_time, end_time: data.end_time };
        if (data.schedule_date) payload.schedule_date = data.schedule_date;
        const c = await scheduleService.createSchedule(payload);
        createdRows.push(c);
      }
      return res.status(201).json(createdRows);
    }
    const created = await scheduleService.createSchedule(data);
    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function updateSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const data = req.body;
    // require schedule_date on update as well
    if (!data || !data.schedule_date) return res.status(400).json({ error: 'schedule_date is required' });
    // If client provided weekdays array for update, delete the original and create new entries
    if (Array.isArray(data.weekdays) && data.weekdays.length > 0) {
      try {
        await scheduleService.deleteSchedule(id);
      } catch (e) { console.error('failed to delete original schedule during multi-weekday update', e) }
      const createdRows = [];
      for (const wd of data.weekdays) {
        const payload = { class_id: data.class_id || undefined, weekday: wd, start_time: data.start_time, end_time: data.end_time };
        if (data.schedule_date) payload.schedule_date = data.schedule_date;
        const c = await scheduleService.createSchedule(payload);
        createdRows.push(c);
      }
      return res.json(createdRows);
    }
    const updated = await scheduleService.updateSchedule(id, data);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

async function deleteSchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await scheduleService.deleteSchedule(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

// Export schedules as an iCalendar (.ics) file
async function exportIcs(req, res) {
  try {
    const opts = {
      q: req.query.q,
      classId: req.query.classId,
      weekday: req.query.weekday,
      page: 1,
      pageSize: 10000
    };
    const data = await scheduleService.getSchedules(opts);
    const rows = data && data.rows ? data.rows : [];

    // helper: map weekday number (0..6) to iCal BYDAY tokens (SU..SA)
    const wkmap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

    function pad(n) { return String(n).padStart(2, '0') }
    function nextDateForWeekday(weekday) {
      const today = new Date();
      const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const diff = (weekday - td.getDay() + 7) % 7;
      const d = new Date(td);
      d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
      return d;
    }

    const now = new Date();
    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//QuanLyHocVien//Schedules//VN');

    for (const r of rows) {
      const uid = `sched-${r.id || Math.random().toString(36).slice(2)}@quanlyhocvien.local`;
      const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const wd = (typeof r.weekday !== 'undefined' && r.weekday !== null) ? Number(r.weekday) : null;
      const startTime = (r.start_time || '08:00').toString();
      const endTime = (r.end_time || '09:30').toString();

      // determine a DTSTART local date: prefer explicit schedule_date if present, otherwise next occurrence of weekday (or today)
      let startDate = new Date();
      if (r.schedule_date) {
        const d = new Date(r.schedule_date);
        if (!isNaN(d.getTime())) startDate = d;
      } else if (wd !== null) startDate = nextDateForWeekday(wd);
      const [sh, sm] = startTime.split(':').map(x => Number(x));
      const [eh, em] = endTime.split(':').map(x => Number(x));
      const dtstart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), sh || 0, sm || 0, 0);
      const dtend = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), eh || 0, em || 0, 0);

      function formatLocal(dt) {
        return dt.getFullYear() + pad(dt.getMonth() + 1) + pad(dt.getDate()) + 'T' + pad(dt.getHours()) + pad(dt.getMinutes()) + pad(dt.getSeconds());
      }

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART:${formatLocal(dtstart)}`);
      lines.push(`DTEND:${formatLocal(dtend)}`);
      const summary = `${r.course_name || r.name || 'Lớp'} - ${r.teacher_name || ''}`.trim();
      lines.push(`SUMMARY:${summary}`);
      if (wd !== null) {
        const byday = wkmap[wd] || 'MO';
        lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byday}`);
      }
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const content = lines.join('\r\n');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="schedules.ics"');
    res.send(content);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate ICS' });
  }
}

module.exports = { listSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule, exportIcs, copySchedule };

async function copySchedule(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const count = Math.max(1, parseInt(req.body.count, 10) || 1);
    const original = await scheduleService.getScheduleById(id);
    if (!original) return res.status(404).json({ error: 'Not found' });

    // determine base date
    function nextDateForWeekday(weekday, fromDate) {
      const today = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      const diff = (weekday - today.getDay() + 7) % 7;
      const d = new Date(today);
      d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
      return d;
    }

    const created = [];
    let baseDate = null;
    if (original.schedule_date) {
      baseDate = new Date(original.schedule_date);
    } else if (typeof original.weekday !== 'undefined' && original.weekday !== null) {
      // original.weekday is DB format (1=Sunday..7=Saturday) or maybe already returned as number
      const dbWd = Number(original.weekday);
      const idx = isNaN(dbWd) ? null : (dbWd - 1);
      const next = nextDateForWeekday(idx != null ? idx : 0, new Date());
      baseDate = next;
    } else {
      baseDate = new Date();
    }

    for (let i = 1; i <= count; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (7 * i)); // advance by weeks
      const payload = {
        class_id: original.class_id,
        weekday: (d.getDay() + 1), // DB format
        start_time: original.start_time,
        end_time: original.end_time,
        schedule_date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      };
      const c = await scheduleService.createSchedule(payload);
      created.push(c);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to copy schedule' });
  }
}

