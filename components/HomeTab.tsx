// @ts-nocheck
import { getTrustPassportSummary, WorkHistoryData, computeTrustedProEligibility } from '../utils/trustEngine'
import { getEligibilityFromTrustLevel, ELIGIBILITY_LABELS } from '../utils/matchingEngine'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,