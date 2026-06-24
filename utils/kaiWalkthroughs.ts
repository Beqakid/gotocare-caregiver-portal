// @ts-nocheck
// Phase 24C: Kai Guided Setup Walkthroughs — Data Model + Definitions

export type KaiWalkthroughStep = {
  id: string
  title: string
  description: string
  targetTab?: string
  targetSubtab?: string
  targetSelector?: string
  ctaLabel?: string
  ctaAction?: string
  fallbackText?: string
}

export type KaiWalkthrough = {
  id: string
  title: string
  intro: string
  icon: string
  steps: KaiWalkthroughStep[]
  completionMessage: string
  restrictedAccountBlock?: boolean
}

// ── Walkthrough Definitions ──────────────────────────────────────────────

const completeProfile: KaiWalkthrough = {
  id: 'complete-profile',
  title: 'Complete Your Profile',
  intro: 'Your profile helps families understand who you are and what kind of care you provide. Let\'s make it stronger step by step.',
  icon: '📝',
  steps: [
    {
      id: 'cp-intro',
      title: 'Let\'s strengthen your profile',
      description: 'A complete profile helps families feel confident about reaching out to you. We\'ll go through each section together — it only takes a few minutes.',
    },
    {
      id: 'cp-open-profile',
      title: 'Open your Profile tab',
      description: 'First, let\'s head to your profile so you can see what families will see.',
      ctaLabel: 'Open Profile',
      ctaAction: 'profile',
    },
    {
      id: 'cp-photo',
      title: 'Check your profile photo',
      description: 'A warm, clear photo makes a big difference. Families are more likely to reach out when they can see a friendly face. Make sure your photo is recent and well-lit.',
      targetTab: 'profile',
      targetSelector: 'profile-photo',
    },
    {
      id: 'cp-bio',
      title: 'Add or update your bio',
      description: 'Your bio is your chance to share a little about yourself — your experience, what you enjoy about caregiving, and what makes you a great fit. Even a few sentences go a long way.',
      targetTab: 'profile',
      targetSelector: 'profile-bio',
    },
    {
      id: 'cp-services',
      title: 'Confirm your care services',
      description: 'Let families know what types of care you offer — companionship, personal care, meal prep, transportation, and more. The clearer you are, the better your matches will be.',
      targetTab: 'profile',
      targetSelector: 'profile-services',
    },
    {
      id: 'cp-preferences',
      title: 'Set your work preferences',
      description: 'Things like preferred hours, live-in vs. hourly, and pet-friendly homes help Carehia find the right opportunities for you.',
      targetTab: 'profile',
      targetSelector: 'profile-preferences',
    },
    {
      id: 'cp-save',
      title: 'Save your changes',
      description: 'Once you\'ve reviewed everything, make sure to save. Your updates will be visible to families right away.',
      targetTab: 'profile',
    },
    {
      id: 'cp-done',
      title: 'You\'re all set!',
      description: 'Your profile is looking stronger. You can always come back and update it anytime.',
    },
  ],
  completionMessage: 'Nice work! Your profile is looking stronger. Families will have a better sense of who you are.',
}

const trustPassport: KaiWalkthrough = {
  id: 'trust-passport',
  title: 'Build Your Trust Passport',
  intro: 'Trust Passport helps you build trust with families step by step. You don\'t need to finish everything today.',
  icon: '🛡️',
  steps: [
    {
      id: 'tp-intro',
      title: 'Let\'s build your trust',
      description: 'Trust Passport is how you show families you\'re reliable and verified. Each piece of proof you add makes your profile stand out. Let\'s take a look.',
    },
    {
      id: 'tp-open-profile',
      title: 'Open your Profile',
      description: 'Trust Passport lives inside your profile. Let\'s head there first.',
      ctaLabel: 'Open Profile',
      ctaAction: 'profile',
    },
    {
      id: 'tp-open-trust',
      title: 'Tap on Trust Passport',
      description: 'Look for the Trust Passport section in your profile. Tap it to see your current progress and available trust steps.',
      ctaLabel: 'Open Trust Passport',
      ctaAction: 'trust',
    },
    {
      id: 'tp-review',
      title: 'Review your progress',
      description: 'You\'ll see which trust steps you\'ve already completed and which ones are still available. Every step counts — even small ones make a difference.',
      targetTab: 'profile',
      targetSubtab: 'trust-passport',
    },
    {
      id: 'tp-choose',
      title: 'Choose your next proof type',
      description: 'Pick whichever trust step feels right — a reference, a certification, an ID check, or something else. There\'s no wrong place to start.',
      targetTab: 'profile',
      targetSubtab: 'trust-passport',
      targetSelector: 'trust-proof-types',
    },
    {
      id: 'tp-add',
      title: 'Tap "Add Proof"',
      description: 'Once you\'ve chosen a type, tap Add Proof to get started. You\'ll be walked through what\'s needed.',
      targetTab: 'profile',
      targetSubtab: 'trust-passport',
      targetSelector: 'trust-add-proof',
    },
    {
      id: 'tp-form',
      title: 'Fill in the details',
      description: 'Complete the form with the information requested. Take your time — accuracy matters more than speed here.',
      targetTab: 'profile',
      targetSubtab: 'trust-passport',
    },
    {
      id: 'tp-submit',
      title: 'Submit your proof',
      description: 'When you\'re ready, submit your proof for review. Most submissions are reviewed quickly, and you\'ll see your trust score update once approved.',
      targetTab: 'profile',
      targetSubtab: 'trust-passport',
    },
    {
      id: 'tp-done',
      title: 'Great progress!',
      description: 'You\'ve taken another step toward a stronger, more trustworthy profile. You can always come back to add more.',
    },
  ],
  completionMessage: 'Great progress! Every trust step makes your profile more trustworthy to families.',
}

const phoneVerification: KaiWalkthrough = {
  id: 'phone-verification',
  title: 'Verify Your Phone',
  intro: 'Phone verification protects your account and adds a trust signal to your Trust Passport. It only takes a minute.',
  icon: '📱',
  steps: [
    {
      id: 'pv-intro',
      title: 'Why verify your phone?',
      description: 'A verified phone number helps Carehia and families trust that your account is real and secure. It also strengthens your Trust Passport score.',
    },
    {
      id: 'pv-how',
      title: 'How it works',
      description: 'You\'ll enter your phone number, receive a 6-digit code, and type it in to confirm. Your number is never displayed publicly — it stays private and secure.',
    },
    {
      id: 'pv-start',
      title: 'Ready to verify?',
      description: 'Open Kai and tap "Verify Now" on the phone verification card. You\'ll be guided through each step. It only takes about 30 seconds.',
      ctaLabel: 'Back to Kai',
      ctaAction: 'close',
    },
  ],
  completionMessage: 'You know how phone verification works. Tap "Verify Now" in Kai to get started!',
}

const serviceArea: KaiWalkthrough = {
  id: 'service-area',
  title: 'Set Your Service Area',
  intro: 'Your service area helps Carehia prepare future opportunities without showing your exact address publicly.',
  icon: '📍',
  steps: [
    {
      id: 'sa-intro',
      title: 'Let\'s set your service area',
      description: 'Setting your service area helps families in your neighborhood find you. Your exact address is never shared — only the general area you\'re willing to work in.',
    },
    {
      id: 'sa-open-profile',
      title: 'Open your Profile',
      description: 'Your service area is part of your profile. Let\'s head there.',
      ctaLabel: 'Open Profile',
      ctaAction: 'profile',
    },
    {
      id: 'sa-find-section',
      title: 'Find the Service Area section',
      description: 'Scroll down to the Service Area section in your profile overview. This is where you\'ll set your location and coverage.',
      ctaLabel: 'Go to Service Area',
      ctaAction: 'section:overview:section-service-area',
      targetTab: 'profile',
      targetSelector: 'section-service-area',
    },
    {
      id: 'sa-enter-location',
      title: 'Enter your city or ZIP code',
      description: 'Type in your city name or ZIP code. This tells Carehia roughly where you\'re based so we can prepare local opportunities for you.',
      targetTab: 'profile',
      targetSelector: 'service-area-input',
    },
    {
      id: 'sa-radius',
      title: 'Set your travel radius',
      description: 'Choose how far you\'re willing to travel for work. A wider radius means more potential opportunities, but pick what feels comfortable for you.',
      targetTab: 'profile',
      targetSelector: 'service-area-radius',
    },
    {
      id: 'sa-save',
      title: 'Save your service area',
      description: 'Once you\'re happy with your settings, save them. Families searching in your area will be able to find your profile more easily.',
      targetTab: 'profile',
    },
    {
      id: 'sa-done',
      title: 'All set!',
      description: 'Your service area is saved. You can update it anytime if you move or want to expand your coverage.',
    },
  ],
  completionMessage: 'Your service area is set. Families nearby will be able to find you more easily.',
}

const timeTracking: KaiWalkthrough = {
  id: 'time-tracking',
  title: 'Track Your Time',
  intro: 'Let\'s walk through time tracking so you feel confident tracking your shifts.',
  icon: '⏱️',
  steps: [
    {
      id: 'tt-intro',
      title: 'Let\'s learn time tracking',
      description: 'Tracking your hours helps you stay organized, build accurate timesheets, and create invoices. I\'ll show you how it works — you\'re always in control of when to start and stop.',
    },
    {
      id: 'tt-open-work',
      title: 'Open your Work tab',
      description: 'Time tracking lives in your Work or Schedule area. Let\'s go there now.',
      ctaLabel: 'Open Work',
      ctaAction: 'work',
    },
    {
      id: 'tt-choose-client',
      title: 'Choose a client',
      description: 'Select the client you\'re working with today. This connects your tracked hours to the right person for timesheets and invoices.',
      targetTab: 'schedule',
      targetSelector: 'client-selector',
    },
    {
      id: 'tt-start-timer',
      title: 'Start the timer when you\'re ready',
      description: 'When you\'re ready to begin your shift, tap the Start button. The timer will begin tracking your hours. Don\'t worry — you can always adjust later if needed.',
      targetTab: 'schedule',
      targetSelector: 'timer-start',
      fallbackText: 'Important: Kai won\'t start the timer for you. You\'re always in control of when your shift begins.',
    },
    {
      id: 'tt-running',
      title: 'Your timer is running',
      description: 'While the timer is running, you\'ll see a live count of your hours. You can continue working — the timer keeps going in the background.',
      targetTab: 'schedule',
      targetSelector: 'timer-active',
    },
    {
      id: 'tt-end-shift',
      title: 'End your shift when you\'re done',
      description: 'When your shift is over, come back and tap the End Shift button. Your tracked time will be saved and ready for timesheets or invoices.',
      targetTab: 'schedule',
      targetSelector: 'timer-stop',
      fallbackText: 'Kai won\'t end your shift automatically. You decide when your work is done.',
    },
    {
      id: 'tt-invoices',
      title: 'Your tracked time supports invoices',
      description: 'Once you\'ve tracked hours, they\'ll appear in your Money tab as "Ready to Invoice." You can turn them into professional invoices whenever you\'re ready.',
    },
  ],
  completionMessage: 'You\'ve got the hang of time tracking. Your tracked hours can support timesheets and invoices.',
  restrictedAccountBlock: true,
}

const invoiceMoney: KaiWalkthrough = {
  id: 'invoice-money',
  title: 'Create an Invoice',
  intro: 'Let\'s walk through creating an invoice from your tracked work.',
  icon: '💰',
  steps: [
    {
      id: 'im-intro',
      title: 'Let\'s create an invoice',
      description: 'Invoicing helps you get paid for your work. Carehia makes it easy to turn tracked hours into a clean, professional invoice. I\'ll guide you through each step.',
    },
    {
      id: 'im-open-money',
      title: 'Open your Money tab',
      description: 'Your invoices and earnings live in the Money tab. Let\'s head there.',
      ctaLabel: 'Open Money',
      ctaAction: 'earnings',
    },
    {
      id: 'im-review-hours',
      title: 'Review your ready-to-invoice hours',
      description: 'You\'ll see a summary of tracked hours that haven\'t been invoiced yet. Take a moment to review and make sure everything looks right.',
      targetTab: 'earnings',
      targetSelector: 'ready-to-invoice',
    },
    {
      id: 'im-create',
      title: 'Tap "Create Invoice"',
      description: 'When you\'re ready, tap the Create Invoice button to start building your invoice. You\'ll be able to review everything before sending.',
      targetTab: 'earnings',
      targetSelector: 'create-invoice-btn',
    },
    {
      id: 'im-details',
      title: 'Review invoice details',
      description: 'Double-check the client name, hours, rate, and total. Make sure everything matches your records. You can edit details before finalizing.',
      targetTab: 'earnings',
      targetSelector: 'invoice-details',
    },
    {
      id: 'im-save-send',
      title: 'Save as draft or send',
      description: 'You can save your invoice as a draft to review later, or send it right away. Either way, you\'re in control.',
      targetTab: 'earnings',
      targetSelector: 'invoice-actions',
      fallbackText: 'Kai won\'t send your invoice automatically. You choose when it\'s ready to go.',
    },
    {
      id: 'im-draft',
      title: 'About draft invoices',
      description: 'When you create a draft invoice, those hours are moved out of "Ready to Invoice" so they won\'t be double-counted. You can still edit or delete the draft anytime.',
    },
    {
      id: 'im-done',
      title: 'Invoice complete!',
      description: 'You\'ve got the process down. Creating invoices gets faster each time you do it.',
    },
  ],
  completionMessage: 'Well done! Your invoice is on its way. Draft invoices remove hours from Ready to Invoice.',
  restrictedAccountBlock: true,
}

// ── Exports ──────────────────────────────────────────────────────────────

export const walkthroughs: KaiWalkthrough[] = [
  completeProfile,
  trustPassport,
  phoneVerification,
  serviceArea,
  timeTracking,
  invoiceMoney,
]

export const walkthroughMap: Record<string, string> = {
  // NBA ids → walkthrough ids
  'complete-profile': 'complete-profile',
  'start-trust-passport': 'trust-passport',
  'verify-phone': 'phone-verification',
  'set-service-area': 'service-area',
  'active-timer': 'time-tracking',
  'create-invoice': 'invoice-money',
  // Quick action ids → walkthrough ids
  'profile': 'complete-profile',
  'trust': 'trust-passport',
  'phone': 'phone-verification',
  'service-area': 'service-area',
  'timer': 'time-tracking',
  'invoice': 'invoice-money',
}

export function getWalkthrough(id: string): KaiWalkthrough | null {
  return walkthroughs.find((w) => w.id === id) || null
}
