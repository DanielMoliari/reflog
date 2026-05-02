import { gql } from '@apollo/client'

export const TRACK_REPOSITORY = gql`
  mutation TrackRepository($githubRepoId: String!) {
    trackRepository(githubRepoId: $githubRepoId) {
      id
      fullName
      isTracked
      syncState
    }
  }
`

export const UNTRACK_REPOSITORY = gql`
  mutation UntrackRepository($id: ID!) {
    untrackRepository(id: $id)
  }
`

export const SYNC_REPOSITORY = gql`
  mutation SyncRepository($id: ID!) {
    syncRepository(id: $id) {
      repositoryId
      queued
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      avatarUrl
    }
  }
`

export const UPDATE_NOTIFICATION_PREFS = gql`
  mutation UpdateNotificationPrefs($input: UpdateNotificationPrefsInput!) {
    updateNotificationPrefs(input: $input) {
      id
      notificationsEnabled
      streakAlertsEnabled
    }
  }
`

export const SEND_TEST_DIGEST = gql`
  mutation SendTestDigest {
    sendTestDigest
  }
`

export const ENABLE_PUBLIC_PROFILE = gql`
  mutation EnablePublicProfile($input: EnablePublicProfileInput!) {
    enablePublicProfile(input: $input) {
      id
      username
      publicProfile
      publicShowRepos
      publicShowStreak
    }
  }
`

export const UPDATE_PUBLIC_PROFILE_PREFS = gql`
  mutation UpdatePublicProfilePrefs($input: UpdatePublicProfilePrefsInput!) {
    updatePublicProfilePrefs(input: $input) {
      id
      publicShowRepos
      publicShowStreak
    }
  }
`

export const DISABLE_PUBLIC_PROFILE = gql`
  mutation DisablePublicProfile {
    disablePublicProfile {
      id
      publicProfile
    }
  }
`
