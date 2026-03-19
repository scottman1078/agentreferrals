import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fetch a single affiliate setting from ar_settings.
 * Returns the numeric value, or the provided fallback if not found.
 */
export async function getAffiliateSetting(
  key: string,
  fallback: number
): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('ar_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error || !data) return fallback

    const parsed = data.value as { value?: number }
    return typeof parsed?.value === 'number' ? parsed.value : fallback
  } catch {
    return fallback
  }
}

/**
 * Fetch all affiliate-related settings at once.
 */
export async function getAffiliateSettings() {
  const [commissionRate, maxDiscount] = await Promise.all([
    getAffiliateSetting('affiliate_commission_rate', 10),
    getAffiliateSetting('affiliate_max_discount', 100),
  ])

  return {
    discountPerReferral: commissionRate,
    maxDiscount,
    rewardsPerFreeMonth: Math.floor(maxDiscount / commissionRate),
  }
}
