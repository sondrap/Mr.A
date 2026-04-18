---
name: Coach Mode
type: roadmap
status: not-started
description: Travis's team coaches can shadow any student's work, leave guidance on their projects and artifacts, and jump into a conversation — without disrupting what the student is doing.
requires: [mvp.md]
effort: large
---

Travis's program isn't just software. There are coaches on his team who work with students directly — reviewing their campaigns, giving feedback on their outreach, catching mistakes before they send a bad T1 email. Right now those coaches operate in a separate channel entirely (DMs, Zoom calls, Skool comments). Coach Mode brings that coaching layer into MRA where the actual work lives. A coach can see a student's project, leave a note on a specific artifact, flag a workflow step that needs attention, and jump into a project-scoped conversation alongside the student.

## What it looks like

**The `coach` role:**
A new role below `admin` and above `student`. Coaches can see all students' work (read-only by default). They cannot modify student artifacts directly but can leave annotations. They can initiate coach-to-student conversations. Coaches are assigned students — each coach has a list of students they're responsible for, configurable by the admin.

**Coach dashboard:**
Coaches land on a different default view than students: their coaching queue. A table of assigned students with: name, last active, current workflow step, any flagged artifacts, and unread messages from students directed to their coach. Sorted by most recent activity.

**Shadowing a student's project:**
From the coaching queue, a coach can open any of their assigned students' projects in a read-only view. They see everything the student sees — workflow progress, artifacts, chat threads. They cannot edit, but they can leave annotations.

**Annotations:**
Anywhere in a student's project — on a specific artifact, on a specific workflow step, on a chat message — a coach can leave an annotation. Annotations appear as a small Brass dot indicator in the student's view. The student clicks the dot to see the coach's note. Annotations are attributed to the coach by name.

**Coach-to-student threads:**
Inside any student's project, a coach can open a dedicated coach thread — separate from the student's Mr. A threads. The student is notified of new coach messages via a badge in their project detail header. Coaches can also include Mr. A in their replies — citing sources from the concept library to support their coaching.

**Flagging:**
Coaches can flag a specific artifact or workflow step as "needs your attention." The flag appears in the student's Overview tab as a small Rust indicator: "Your coach left a note on your T1 email."

## Key details

- Coaches can only see students they've been assigned to — they don't have access to the full student roster unless they also have admin access
- Coach annotations are stored separately from artifact content and do not modify the artifact's version history
- Students can reply to annotations inline, turning them into a threaded comment chain
- A coach can also use Mr. A to do their own research on behalf of a student — they have full access to the concept library and chat from within the coaching view
- Admin can configure whether coach threads go to specific coaches or to a shared team inbox

~~~
Technical: new role `coach` in the platform roles system. New table `coach_assignments(coachId, studentId, assignedAt, assignedBy)`. Annotations stored in `annotations(coachId, projectId, targetType, targetId, body, resolvedAt)` — targetType can be `artifact`, `workflow_step`, or `chat_message`. Coach threads are a new `conversations` type: `type: 'coach'`, visible to both the coach and the student but not surfaced in the student's main chat rail. Notifications use the platform's built-in notification system.
~~~
