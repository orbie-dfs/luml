import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtifactPage from '../index.vue'

const ARTIFACT_ID = '01a07c0b-be85-7214-93fd-c440ec0123d9'

const harness = vi.hoisted(() => ({
  artifacts: {
    currentArtifact: null,
    getArtifact: vi.fn(),
    setCurrentArtifact: vi.fn(),
    resetCurrentArtifact: vi.fn(),
    refreshCurrentArtifact: vi.fn(),
    downloadArtifact: vi.fn(),
    resetCurrentModelTag: vi.fn(),
    resetCurrentModelMetadata: vi.fn(),
    resetCurrentModelHtmlBlobUrl: vi.fn(),
    resetExperimentSnapshotProvider: vi.fn(),
  },
  params: {
    organizationId: 'organization',
    id: 'orbit',
    collectionId: 'collection',
    artifactId: '',
  },
  toastAdd: vi.fn(),
}))

vi.mock('@/stores/artifacts', () => ({ useArtifactsStore: () => harness.artifacts }))
vi.mock('@/stores/orbits', () => ({
  useOrbitsStore: () => ({ getCurrentOrbitPermissions: undefined }),
}))
vi.mock('@/stores/collections', () => ({
  useCollectionsStore: () => ({ currentCollection: null }),
}))
vi.mock('@/stores/datasets', () => ({ useDatasetsStore: () => ({ reset: vi.fn() }) }))
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return {
    ...actual,
    useRoute: () => ({ params: harness.params }),
    useRouter: () => ({ push: vi.fn() }),
  }
})
vi.mock('primevue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('primevue')>()
  return { ...actual, useToast: () => ({ add: harness.toastAdd }) }
})

async function mountArtifactPage(artifactId: string) {
  harness.params.artifactId = artifactId
  shallowMount(ArtifactPage, { global: { stubs: { RouterView: true } } })
  await flushPromises()
}

describe('ArtifactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a malformed artifact id without requesting it', async () => {
    await mountArtifactPage('abc')

    expect(harness.artifacts.getArtifact).not.toHaveBeenCalled()
    expect(harness.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Invalid artifact ID' }),
    )
  })

  it('shows the backend message when the artifact does not exist', async () => {
    harness.artifacts.getArtifact.mockRejectedValue({
      response: { status: 404, data: { detail: 'Artifact not found' } },
    })

    await mountArtifactPage(ARTIFACT_ID)

    expect(harness.artifacts.getArtifact).toHaveBeenCalledWith(ARTIFACT_ID, {
      organizationId: 'organization',
      orbitId: 'orbit',
      collectionId: 'collection',
    })
    expect(harness.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Artifact not found' }),
    )
  })
})
