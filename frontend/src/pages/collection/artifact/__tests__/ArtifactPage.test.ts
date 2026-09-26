import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArtifactPage from '../index.vue'

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
    useRoute: () => ({
      params: {
        organizationId: 'organization',
        id: 'orbit',
        collectionId: 'collection',
        artifactId: 'abc',
      },
    }),
    useRouter: () => ({ push: vi.fn() }),
  }
})
vi.mock('primevue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('primevue')>()
  return { ...actual, useToast: () => ({ add: harness.toastAdd }) }
})

async function mountWithLoadError(error: unknown) {
  harness.artifacts.getArtifact.mockRejectedValue(error)
  shallowMount(ArtifactPage, { global: { stubs: { RouterView: true } } })
  await flushPromises()
}

describe('ArtifactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports a malformed artifact id as not found', async () => {
    await mountWithLoadError({
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          detail: [
            {
              type: 'uuid_parsing',
              loc: ['path', 'artifact_id'],
              msg: 'Input should be a valid UUID, invalid length: expected length 32 for simple format, found 3',
            },
          ],
        },
      },
    })

    expect(harness.artifacts.getArtifact).toHaveBeenCalledWith('abc', {
      organizationId: 'organization',
      orbitId: 'orbit',
      collectionId: 'collection',
    })
    expect(harness.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Artifact not found' }),
    )
  })

  it('shows the backend message for other load errors', async () => {
    await mountWithLoadError({
      response: { status: 403, data: { detail: 'Insufficient permissions' } },
    })

    expect(harness.toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Insufficient permissions' }),
    )
  })
})
