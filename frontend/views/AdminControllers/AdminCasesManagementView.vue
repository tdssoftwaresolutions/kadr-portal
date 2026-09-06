<template>
  <b-container fluid class="kadr-animate-in">
    <kadr-page-header :title="$t('adminCases.title')" :subtitle="$t('adminCases.subtitle')">
      <template v-if="totalCases >= 0" #actions>
        <small class="text-muted">{{ $t('adminCases.activeCaseCount', { count: totalCases }) }}</small>
      </template>
    </kadr-page-header>
    <b-row>
      <b-col sm="12">
        <iq-card>
          <template v-slot:body>
            <b-row class="mb-3">
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">{{ $t('adminCases.mediator') }}</label>
                <b-form-select
                  v-model="filters.mediatorId"
                  :options="mediatorFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">{{ $t('adminCases.firstParty') }}</label>
                <b-form-select
                  v-model="filters.firstPartyId"
                  :options="firstPartyFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">{{ $t('adminCases.secondParty') }}</label>
                <b-form-select
                  v-model="filters.secondPartyId"
                  :options="secondPartyFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
              <b-col md="6" lg="3" class="mb-2">
                <label class="small text-muted mb-1">{{ $t('adminCases.status') }}</label>
                <b-form-select
                  v-model="filters.status"
                  :options="statusFilterOptions"
                  @change="onFilterChange"
                />
              </b-col>
            </b-row>

            <b-row v-if="cases.length > 0">
              <b-col md="6" v-for="c in cases" :key="c.id" class="mb-3">
                <b-card class="h-100 user-card">
                  <b-card-body class="d-flex flex-column">
                    <div class="mb-2">
                      <h5 class="mb-1">{{ c.caseId || $t('adminCases.case') }}</h5>
                      <b-badge variant="info" class="me-1">{{ statusLabel(c) }}</b-badge>
                      <b-badge variant="secondary">{{ subStatusLabel(c) }}</b-badge>
                    </div>
                    <p class="mb-2"><strong>{{ $t('adminCases.firstParty') }}:</strong> {{ partyName(c.user_cases_first_partyTouser) }}</p>
                    <p class="mb-2"><strong>{{ $t('adminCases.secondParty') }}:</strong> {{ partyName(c.user_cases_second_partyTouser) }}</p>
                    <p class="mb-2">
                      <strong>{{ $t('adminCases.mediator') }}:</strong>
                      {{ c.user_cases_mediatorTouser ? c.user_cases_mediatorTouser.name : $t('adminCases.notAssigned') }}
                    </p>
                    <p class="mb-2">
                      <strong>{{ $t('adminCases.type') }}:</strong>
                      <span v-if="c.case_type">{{ c.case_type }}</span>
                      <b-badge v-else variant="warning">{{ $t('adminCases.awaitingTypeApproval') }}</b-badge>
                    </p>
                    <p class="mb-2">
                      <strong>{{ $t('adminCases.revenueShare') }}:</strong> {{ $t('adminCases.revenueShareValue', { percent: Number(c.mediator_commission || 0).toFixed(2) }) }}
                    </p>
                    <div class="mt-auto d-flex flex-wrap justify-content-end">
                      <b-button variant="outline-primary" size="sm" class="me-1 mb-1" @click="openDetailModal(c)">
                        {{ $t('adminCases.viewDetails') }}
                      </b-button>
                      <b-button
                        v-if="needsCaseTypeApproval(c)"
                        variant="warning"
                        size="sm"
                        class="mb-1"
                        @click="openApproveTypeModal(c)"
                      >
                        {{ $t('adminCases.approveCaseType') }}
                      </b-button>
                      <b-button
                        v-else
                        variant="primary"
                        size="sm"
                        class="mb-1"
                        @click="openAssignModal(c)"
                      >
                        {{ c.user_cases_mediatorTouser ? $t('adminCases.changeMediator') : $t('adminCases.assignMediator') }}
                      </b-button>
                    </div>
                  </b-card-body>
                </b-card>
              </b-col>
            </b-row>
            <kadr-empty-state
              v-else
              icon="fas fa-folder-open"
              :title="$t('adminCases.noCases')"
              :description="$t('adminCases.noCasesDescription')"
            />
            <b-pagination
              v-if="totalCases > 0"
              v-model="currentPage"
              :total-rows="totalCases"
              :per-page="perPage"
              align="center"
              class="mt-3"
              @input="fetchCases"
            />
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-modal
      v-model="detailModalVisible"
      size="xl"
      modal-class="case-detail-modal"
      :title="$t('adminCases.caseDetails')"
      no-footer
      scrollable
      @hidden="onDetailModalHidden"
    >
      <div v-if="selectedCase" class="admin-case-detail">
        <header class="detail-hero mb-3">
          <div>
            <h5 class="mb-1">{{ selectedCase.caseId || $t('adminCases.case') }}</h5>
            <p class="mb-0 text-muted small">
              {{ $t('adminCases.opened', { date: formatDate(selectedCase.created_at) }) }}
              <span v-if="selectedCase.updated_at"> · {{ $t('adminCases.updated', { date: formatDate(selectedCase.updated_at) }) }}</span>
            </p>
          </div>
          <div class="detail-hero-badges">
            <b-badge variant="info">{{ statusLabel(selectedCase) }}</b-badge>
            <b-badge variant="secondary">{{ subStatusLabel(selectedCase) }}</b-badge>
          </div>
        </header>

        <b-tabs v-model="detailTab" content-class="detail-tab-body" nav-class="detail-tab-nav" pills card>
          <b-tab :title="$t('adminCases.overview')">
            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.caseSummary') }}</h6>
              <dl class="detail-dl row">
                <dt class="col-sm-3">{{ $t('adminCases.category') }}</dt>
                <dd class="col-sm-9">{{ selectedCase.category || '—' }}</dd>
                <dt class="col-sm-3">{{ $t('adminCases.caseType') }}</dt>
                <dd class="col-sm-9">
                  <span v-if="selectedCase.case_type">{{ selectedCase.case_type }}</span>
                  <b-badge v-else variant="warning">{{ $t('adminCases.awaitingTypeApproval') }}</b-badge>
                </dd>
                <dt class="col-sm-3">{{ $t('adminCases.description') }}</dt>
                <dd class="col-sm-9 text-break">{{ selectedCase.description || '—' }}</dd>
              </dl>
            </div>

            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.peopleOnCase') }}</h6>
              <b-row>
                <b-col md="4" class="mb-2">
                  <div class="party-tile">
                    <span class="party-tile-label">{{ $t('adminCases.firstParty') }}</span>
                    <p class="party-tile-main">{{ partyName(selectedCase.user_cases_first_partyTouser) }}</p>
                    <p class="party-tile-meta">{{ partyExtraLines(selectedCase.user_cases_first_partyTouser) }}</p>
                  </div>
                </b-col>
                <b-col md="4" class="mb-2">
                  <div class="party-tile">
                    <span class="party-tile-label">{{ $t('adminCases.secondParty') }}</span>
                    <p class="party-tile-main">{{ partyName(selectedCase.user_cases_second_partyTouser) }}</p>
                    <p class="party-tile-meta">{{ partyExtraLines(selectedCase.user_cases_second_partyTouser) }}</p>
                  </div>
                </b-col>
                <b-col md="4" class="mb-2">
                  <div class="party-tile">
                    <span class="party-tile-label">{{ $t('adminCases.mediator') }}</span>
                    <p class="party-tile-main">
                      {{ selectedCase.user_cases_mediatorTouser ? partyName(selectedCase.user_cases_mediatorTouser) : $t('adminCases.notAssigned') }}
                    </p>
                    <p v-if="selectedCase.user_cases_mediatorTouser" class="party-tile-meta">{{ partyExtraLines(selectedCase.user_cases_mediatorTouser) }}</p>
                  </div>
                </b-col>
              </b-row>
            </div>

            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.representatives') }}</h6>
              <b-row>
                <b-col md="6" class="mb-2">
                  <div class="party-tile">
                    <span class="party-tile-label">{{ $t('adminCases.firstPartyRepresentative') }}</span>
                    <template v-if="selectedCase.user_cases_first_party_repTouser">
                      <p class="party-tile-main">
                        {{ partyName(selectedCase.user_cases_first_party_repTouser) }}
                        <b-badge :variant="selectedCase.user_cases_first_party_repTouser.active ? 'success' : 'warning'" class="ms-1">
                          {{ selectedCase.user_cases_first_party_repTouser.active ? $t('adminCases.repActive') : $t('adminCases.repPending') }}
                        </b-badge>
                      </p>
                      <p class="party-tile-meta">{{ partyExtraLines(selectedCase.user_cases_first_party_repTouser) }}</p>
                    </template>
                    <p v-else class="party-tile-meta">{{ $t('adminCases.notAdded') }}</p>
                    <b-button size="sm" variant="outline-primary" class="mt-1" @click="openAddRepresentativeModal(selectedCase, 'first_party')">
                      {{ selectedCase.user_cases_first_party_repTouser ? $t('adminCases.changeRepresentative') : $t('adminCases.addRepresentative') }}
                    </b-button>
                  </div>
                </b-col>
                <b-col md="6" class="mb-2">
                  <div class="party-tile">
                    <span class="party-tile-label">{{ $t('adminCases.secondPartyRepresentative') }}</span>
                    <template v-if="selectedCase.user_cases_second_party_repTouser">
                      <p class="party-tile-main">
                        {{ partyName(selectedCase.user_cases_second_party_repTouser) }}
                        <b-badge :variant="selectedCase.user_cases_second_party_repTouser.active ? 'success' : 'warning'" class="ms-1">
                          {{ selectedCase.user_cases_second_party_repTouser.active ? $t('adminCases.repActive') : $t('adminCases.repPending') }}
                        </b-badge>
                      </p>
                      <p class="party-tile-meta">{{ partyExtraLines(selectedCase.user_cases_second_party_repTouser) }}</p>
                    </template>
                    <p v-else class="party-tile-meta">{{ $t('adminCases.notAdded') }}</p>
                    <b-button size="sm" variant="outline-primary" class="mt-1" @click="openAddRepresentativeModal(selectedCase, 'second_party')">
                      {{ selectedCase.user_cases_second_party_repTouser ? $t('adminCases.changeRepresentative') : $t('adminCases.addRepresentative') }}
                    </b-button>
                  </div>
                </b-col>
              </b-row>
            </div>

            <div class="detail-section commission-box">
              <h6 class="detail-section-title">{{ $t('adminCases.revenueSharePercent') }}</h6>
              <div class="d-flex flex-wrap align-items-center">
                <b-form-input v-model.number="selectedCaseCommission" type="number" min="0" step="0.01" class="commission-input" />
                <b-button size="sm" variant="primary" class="ms-2" @click="saveCaseCommission">{{ $t('adminCases.save') }}</b-button>
              </div>
            </div>
          </b-tab>

          <b-tab :title="$t('adminCases.activity')">
            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.meetings') }}</h6>
              <div v-if="!selectedCase.events || selectedCase.events.length === 0" class="text-muted small">{{ $t('adminCases.noMeetings') }}</div>
              <div v-else class="meeting-stack">
                <article
                  v-for="meeting in meetingRows(selectedCase.events)"
                  :key="meeting.id"
                  class="meeting-card"
                >
                  <div class="meeting-head">
                    <div>
                      <h6 class="mb-1">{{ meeting.title || $t('adminCases.meeting') }}</h6>
                      <p class="mb-0 small text-muted">{{ $t('adminCases.starts') }}: {{ meeting.start }}</p>
                      <p class="mb-0 small text-muted">{{ $t('adminCases.ends') }}: {{ meeting.end }}</p>
                    </div>
                    <div class="meeting-head-actions">
                      <span class="meeting-status-tag" :class="meeting.statusClass">{{ meeting.statusLabel }}</span>
                      <b-button
                        v-if="meeting.meeting_link"
                        size="sm"
                        variant="primary"
                        :href="meeting.meeting_link"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ $t('adminCases.join') }}
                      </b-button>
                      <b-button
                        v-if="meeting.google_calendar_link"
                        size="sm"
                        variant="outline-secondary"
                        :href="meeting.google_calendar_link"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ $t('adminCases.calendar') }}
                      </b-button>
                    </div>
                  </div>

                  <b-tabs class="feedback-tabs mt-2" content-class="pt-2" pills small>
                    <b-tab :title="$t('adminCases.mediator')">
                      <section class="feedback-box">
                        <p><strong>{{ $t('adminCases.summary') }}: </strong> {{ meeting.meeting_summary || '—' }}</p>
                        <p><strong>{{ $t('adminCases.nextSteps') }}: </strong> {{ meeting.mediator_next_steps || '—' }}</p>
                        <p><strong>{{ $t('adminCases.submitted') }}: </strong> {{ meeting.mediator_feedback_at || '—' }}</p>
                      </section>
                    </b-tab>
                    <b-tab :title="$t('adminCases.firstParty')">
                      <section class="feedback-box">
                        <p>
                          <strong>{{ $t('adminCases.rating') }}: </strong>
                          <span v-if="meeting.first_party_rating != null">{{ meeting.first_party_rating }}/5 {{ meeting.first_party_stars }}</span>
                          <span v-else>—</span>
                        </p>
                        <p><strong>{{ $t('adminCases.nextSteps') }}: </strong> {{ meeting.first_party_next_steps || '—' }}</p>
                        <p><strong>{{ $t('adminCases.submitted') }}: </strong> {{ meeting.first_party_feedback_at || '—' }}</p>
                      </section>
                    </b-tab>
                    <b-tab :title="$t('adminCases.secondParty')">
                      <section class="feedback-box">
                        <p>
                          <strong>{{ $t('adminCases.rating') }}: </strong>
                          <span v-if="meeting.second_party_rating != null">{{ meeting.second_party_rating }}/5 {{ meeting.second_party_stars }}</span>
                          <span v-else>—</span>
                        </p>
                        <p><strong>{{ $t('adminCases.nextSteps') }}: </strong> {{ meeting.second_party_next_steps || '—' }}</p>
                        <p><strong>{{ $t('adminCases.submitted') }}: </strong> {{ meeting.second_party_feedback_at || '—' }}</p>
                      </section>
                    </b-tab>
                  </b-tabs>
                </article>
              </div>
            </div>

            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.caseProgress') }}</h6>
              <CaseProgressPanel
                v-if="selectedCase.case_progress"
                :progress="selectedCase.case_progress"
                :is-past-view="isSelectedCaseClosed"
              />
              <div v-else class="text-muted small">{{ $t('adminCases.noProgress') }}</div>
            </div>

            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.paymentsOnFile') }}</h6>
              <div v-if="!selectedCase.transactions || selectedCase.transactions.length === 0" class="text-muted small">{{ $t('adminCases.noPayments') }}</div>
              <div v-else class="table-responsive">
                <table class="table table-sm table-borderless payments-table mb-0">
                  <thead>
                    <tr>
                      <th>{{ $t('adminCases.date') }}</th>
                      <th>{{ $t('adminCases.amount') }}</th>
                      <th>{{ $t('adminCases.status') }}</th>
                      <th>{{ $t('adminCases.reason') }}</th>
                      <th>{{ $t('adminCases.reference') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="tx in selectedCase.transactions" :key="tx.transaction_id">
                      <td>{{ formatDate(tx.transaction_date) }}</td>
                      <td>{{ tx.amount }} {{ tx.currency || '' }}</td>
                      <td>
                        <b-badge :variant="tx.success ? 'success' : 'danger'" class="text-uppercase">{{ tx.success ? $t('adminCases.paid') : $t('adminCases.failed') }}</b-badge>
                      </td>
                      <td>{{ tx.reason || '—' }}</td>
                      <td class="small text-break">{{ tx.reference_id || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </b-tab>

          <b-tab :title="$t('adminCases.agreementAndFiles')">
            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.evidenceUploads') }}</h6>
              <div v-if="!selectedCase.evidence_document_url" class="text-muted small">{{ $t('adminCases.noEvidence') }}</div>
              <div v-else class="docs-grid">
                <FilePreview
                  key="evidence"
                  :url="selectedCase.evidence_document_url"
                  :name="$t('adminCases.evidenceDocument')"
                />
              </div>
            </div>

            <div class="detail-section">
              <h6 class="detail-section-title">{{ $t('adminCases.finalAgreement') }}</h6>
              <p class="text-muted small">
                {{ $t('adminCases.agreementHint') }}
              </p>
              <div v-if="!agreementRecord" class="text-muted small">{{ $t('adminCases.noAgreement') }}</div>
              <template v-else>
                <dl class="detail-dl compact row mb-2">
                  <dt class="col-sm-4">{{ $t('adminCases.agreementDrafted') }}</dt>
                  <dd class="col-sm-8">{{ formatDate(agreementRecord.created_at) }}</dd>
                  <dt class="col-sm-4">{{ $t('adminCases.firstPartySigned') }}</dt>
                  <dd class="col-sm-8">{{ agreementRecord.first_party_signature_datetime ? formatDate(agreementRecord.first_party_signature_datetime) : '—' }}</dd>
                  <dt class="col-sm-4">{{ $t('adminCases.secondPartySigned') }}</dt>
                  <dd class="col-sm-8">{{ agreementRecord.second_party_signature_datetime ? formatDate(agreementRecord.second_party_signature_datetime) : '—' }}</dd>
                </dl>
                <div v-if="agreementRecord.mediation_agreement_link" class="mb-3">
                  <b-button
                    variant="primary"
                    size="sm"
                    :href="agreementRecord.mediation_agreement_link"
                    target="_blank"
                    rel="noopener"
                  >
                    {{ $t('adminCases.openSignedAgreement') }}
                  </b-button>
                  <div class="docs-grid mt-2">
                    <FilePreview
                      key="agreement-pdf"
                      :url="agreementRecord.mediation_agreement_link"
                      :name="$t('adminCases.signedAgreementPreview')"
                    />
                  </div>
                </div>
                <div v-if="agreementRecord.agreed_terms" class="agreed-terms-box">
                  <h6 class="small font-weight-bold text-muted mb-2">{{ $t('adminCases.agreedTerms') }}</h6>
                  <div class="agreed-terms-html" v-html="agreementRecord.agreed_terms"></div>
                </div>
              </template>
            </div>
          </b-tab>
        </b-tabs>

        <div class="d-flex justify-content-end detail-modal-footer">
          <b-button variant="secondary" @click="detailModalVisible = false">{{ $t('adminCases.close') }}</b-button>
          <b-button
            v-if="needsCaseTypeApproval(selectedCase)"
            variant="warning"
            class="ms-2"
            @click="openApproveTypeModal(selectedCase)"
          >
            {{ $t('adminCases.approveCaseType') }}
          </b-button>
          <b-button
            v-else
            variant="primary"
            class="ms-2"
            @click="openAssignFromDetail"
          >
            {{ $t('adminCases.assignOrChangeMediator') }}
          </b-button>
        </div>
      </div>
    </b-modal>

    <b-modal v-model="approveTypeModalVisible" :title="$t('adminCases.approveCaseType')" no-footer>
      <p class="text-muted small mb-3">
        {{ $t('adminCases.approveCaseTypeModalHint') }}
      </p>
      <p v-if="caseForTypeApproval" class="mb-3">
        <strong>{{ caseForTypeApproval.caseId || $t('adminCases.case') }}</strong>
        · {{ partyName(caseForTypeApproval.user_cases_first_partyTouser) }}
      </p>
      <b-form-group :label="$t('adminCases.caseTypeLabel')" label-for="approve-case-type">
        <b-form-select
          id="approve-case-type"
          v-model="selectedCaseType"
          :options="caseTypeOptions"
        />
      </b-form-group>
      <div class="d-flex justify-content-end">
        <b-button variant="secondary" class="me-2" @click="approveTypeModalVisible = false">{{ $t('adminCases.cancel') }}</b-button>
        <b-button variant="success" :disabled="!selectedCaseType || approvingCaseType" @click="confirmApproveCaseType">
          <kadr-spinner v-if="approvingCaseType" size="sm" class="me-1" />
          {{ $t('adminCases.approve') }}
        </b-button>
      </div>
    </b-modal>

    <b-modal v-model="assignModalVisible" size="lg" :title="assignModalTitle" no-footer scrollable>
      <p class="text-muted small mb-3">
        {{ $t('adminCases.assignModalHint') }}
      </p>
      <b-form-input v-model="mediatorSearch" :placeholder="$t('adminCases.searchByNameOrEmail')" class="mb-3" />
      <b-row>
        <b-col md="6" v-for="m in filteredMediators" :key="m.id" class="mb-3">
          <b-card class="h-100 user-card" :class="{ 'border-primary': selectedMediatorId === m.id }">
            <b-card-body class="d-flex flex-column">
              <div class="d-flex align-items-center mb-2">
                <img
                  v-if="m.profile_picture_url"
                  :src="m.profile_picture_url"
                  class="rounded-circle me-2"
                  width="44"
                  height="44"
                  alt=""
                />
                <div>
                  <h6 class="mb-0">{{ m.name }}</h6>
                  <small class="text-muted">{{ m.email }}</small>
                </div>
              </div>
              <p class="mb-1 small" v-if="m.phone_number"><strong>{{ $t('adminCases.phone') }}:</strong> {{ m.phone_number }}</p>
              <p class="mb-1 small" v-if="m.state"><strong>{{ $t('adminCases.state') }}:</strong> {{ m.state }}</p>
              <p class="mb-2 small" v-if="practiceAreas(m)"><strong>{{ $t('adminCases.practiceAreas') }}:</strong> {{ practiceAreas(m) }}</p>
              <div class="mt-auto">
                <b-button
                  size="sm"
                  :variant="selectedMediatorId === m.id ? 'primary' : 'outline-primary'"
                  @click="selectedMediatorId = m.id"
                >
                  {{ selectedMediatorId === m.id ? $t('adminCases.selected') : $t('adminCases.select') }}
                </b-button>
              </div>
            </b-card-body>
          </b-card>
        </b-col>
      </b-row>
      <div v-if="filteredMediators.length === 0" class="text-center text-muted py-3">{{ $t('adminCases.noMediatorsMatch') }}</div>
      <div class="d-flex justify-content-end mt-3">
        <b-button variant="secondary" @click="assignModalVisible = false">{{ $t('adminCases.cancel') }}</b-button>
        <b-button variant="primary" class="ms-2" :disabled="!selectedMediatorId" @click="confirmAssignMediator">
          {{ $t('adminCases.confirmAssignment') }}
        </b-button>
      </div>
    </b-modal>

    <b-modal v-model="repModalVisible" :title="repModalTitle" no-footer>
      <p class="text-muted small mb-3">
        {{ repForm.side === 'second_party' ? $t('adminCases.repModalHintSecond') : $t('adminCases.repModalHintFirst') }}
      </p>
      <div class="mb-3">
        <label for="rep-name">{{ $t('adminCases.repName') }}</label>
        <b-form-input id="rep-name" v-model="repForm.representativeName" :placeholder="$t('adminCases.repNamePlaceholder')" />
      </div>
      <div class="mb-3">
        <label for="rep-email">{{ $t('adminCases.repEmail') }} <span class="text-danger">*</span></label>
        <b-form-input id="rep-email" v-model="repForm.representativeEmail" type="email" :placeholder="$t('adminCases.repEmailPlaceholder')" />
      </div>
      <div class="mb-3">
        <label for="rep-phone">{{ $t('adminCases.repPhone') }}</label>
        <b-form-input id="rep-phone" v-model="repForm.representativePhone" type="tel" :placeholder="$t('adminCases.repPhonePlaceholder')" />
      </div>
      <div class="mb-3" v-if="repHasExisting">
        <b-form-checkbox v-model="repForm.allowReplace">
          {{ $t('adminCases.replaceExisting') }}
        </b-form-checkbox>
      </div>
      <div class="d-flex justify-content-end mt-3">
        <b-button variant="secondary" @click="repModalVisible = false">{{ $t('adminCases.cancel') }}</b-button>
        <b-button variant="primary" class="ms-2" :disabled="savingRep" @click="confirmAddRepresentative">
          <kadr-spinner v-if="savingRep" size="sm" class="me-1" />
          {{ $t('adminCases.saveRepresentative') }}
        </b-button>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import FilePreview from '../../components/DocumentPreview.vue'
import CaseProgressPanel from '../../components/cases/CaseProgressPanel.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'
import KadrEmptyState from '../../components/kadr/KadrEmptyState.vue'

export default {
  name: 'AdminCasesManagementView',
  components: {
    FilePreview,
    CaseProgressPanel,
    KadrPageHeader,
    KadrEmptyState
  },
  mounted () {
    sofbox.index()
    this.loadMeta()
    this.fetchCases()
  },
  data () {
    return {
      meta: null,
      cases: [],
      totalCases: 0,
      currentPage: 1,
      perPage: 10,
      filters: {
        mediatorId: null,
        firstPartyId: null,
        secondPartyId: null,
        status: null
      },
      detailModalVisible: false,
      assignModalVisible: false,
      approveTypeModalVisible: false,
      selectedCase: null,
      caseForAssign: null,
      caseForTypeApproval: null,
      selectedCaseType: null,
      approvingCaseType: false,
      mediatorSearch: '',
      selectedMediatorId: null,
      meetingFields: [],
      selectedCaseCommission: 0,
      detailTab: 0,
      repModalVisible: false,
      savingRep: false,
      caseForRep: null,
      repForm: {
        side: 'first_party',
        representativeName: '',
        representativeEmail: '',
        representativePhone: '',
        allowReplace: false
      }
    }
  },
  computed: {
    adminUserId () {
      const u = this.$store.getters.user
      return (u && u.id) ? u.id : ''
    },
    agreementRecord () {
      if (!this.selectedCase) return null
      return this.selectedCase.case_agreement_tracking || null
    },
    isSelectedCaseClosed () {
      if (!this.selectedCase) return false
      const statusId = (this.selectedCase.case_statuses?.id || this.selectedCase.status || '').toLowerCase()
      return ['closed_success', 'closed_no_success', 'cancelled', 'failed', 'escalated', 'on_hold'].includes(statusId)
    },
    caseTypeOptions () {
      return [
        { value: null, text: this.$t('adminCases.selectCaseType') },
        { value: 'Mediation', text: 'Mediation' },
        { value: 'Arbitrator', text: 'Arbitrator' },
        { value: 'Counsellor', text: 'Counsellor' }
      ]
    },
    mediatorFilterOptions () {
      const base = [
        { value: null, text: this.$t('adminCases.allMediators') },
        { value: '__unassigned__', text: this.$t('adminCases.unassignedOnly') }
      ]
      const rest = (this.meta && this.meta.mediators ? this.meta.mediators : []).map(m => ({
        value: m.id,
        text: `${m.name} (${m.email})`
      }))
      return base.concat(rest)
    },
    firstPartyFilterOptions () {
      const base = [{ value: null, text: this.$t('adminCases.allFirstParties') }]
      const rest = (this.meta && this.meta.firstParties ? this.meta.firstParties : []).map(u => ({
        value: u.id,
        text: `${u.name} (${u.email})`
      }))
      return base.concat(rest)
    },
    secondPartyFilterOptions () {
      const base = [{ value: null, text: this.$t('adminCases.allSecondParties') }]
      const rest = (this.meta && this.meta.secondParties ? this.meta.secondParties : []).map(u => ({
        value: u.id,
        text: `${u.name} (${u.email})`
      }))
      return base.concat(rest)
    },
    statusFilterOptions () {
      const base = [{ value: null, text: this.$t('adminCases.allStatuses') }]
      const rest = (this.meta && this.meta.statuses ? this.meta.statuses : []).map(s => ({
        value: s.id,
        text: s.name
      }))
      return base.concat(rest)
    },
    filteredMediators () {
      const list = (this.meta && this.meta.mediators) ? this.meta.mediators : []
      const q = (this.mediatorSearch || '').trim().toLowerCase()
      if (!q) return list
      return list.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q))
      )
    },
    assignModalTitle () {
      if (!this.caseForAssign) return this.$t('adminCases.assignMediator')
      return this.caseForAssign.user_cases_mediatorTouser
        ? this.$t('adminCases.changeMediator')
        : this.$t('adminCases.assignMediator')
    },
    repHasExisting () {
      if (!this.caseForRep) return false
      return this.repForm.side === 'second_party'
        ? Boolean(this.caseForRep.user_cases_second_party_repTouser)
        : Boolean(this.caseForRep.user_cases_first_party_repTouser)
    },
    repModalTitle () {
      if (this.repForm.side === 'second_party') {
        return this.repHasExisting
          ? this.$t('adminCases.changeSecondPartyRepresentative')
          : this.$t('adminCases.addSecondPartyRepresentative')
      }
      return this.repHasExisting
        ? this.$t('adminCases.changeFirstPartyRepresentative')
        : this.$t('adminCases.addFirstPartyRepresentative')
    }
  },
  methods: {
    needsCaseTypeApproval (c) {
      if (!c) return false
      const statusId = (c.case_statuses?.id || c.status || '').toLowerCase()
      return statusId === 'new' && !c.case_type
    },
    openApproveTypeModal (c) {
      this.caseForTypeApproval = c
      this.selectedCaseType = null
      this.approveTypeModalVisible = true
    },
    async confirmApproveCaseType () {
      if (!this.caseForTypeApproval || !this.selectedCaseType) return
      this.approvingCaseType = true
      const res = await this.$store.dispatch('approveCaseType', {
        caseId: this.caseForTypeApproval.id,
        caseType: this.selectedCaseType
      })
      this.approvingCaseType = false
      if (res.success) {
        this.approveTypeModalVisible = false
        this.detailModalVisible = false
        this.fetchCases()
      }
    },
    openAddRepresentativeModal (c, side) {
      this.caseForRep = c
      this.repForm = {
        side: side || 'first_party',
        representativeName: '',
        representativeEmail: '',
        representativePhone: '',
        allowReplace: false
      }
      this.repModalVisible = true
    },
    async confirmAddRepresentative () {
      if (!this.caseForRep) return
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      const email = (this.repForm.representativeEmail || '').trim()
      if (!email) {
        this.$store.dispatch('alert/showAlert', { message: this.$t('adminCases.enterRepEmail'), type: 'danger' }, { root: true })
        return
      }
      if (!emailPattern.test(email)) {
        this.$store.dispatch('alert/showAlert', { message: this.$t('adminCases.invalidRepEmail'), type: 'danger' }, { root: true })
        return
      }
      this.savingRep = true
      const res = await this.$store.dispatch('addCaseRepresentative', {
        caseId: this.caseForRep.id,
        side: this.repForm.side,
        representativeEmail: email.toLowerCase(),
        representativeName: (this.repForm.representativeName || '').trim(),
        representativePhone: (this.repForm.representativePhone || '').trim(),
        allowReplace: Boolean(this.repForm.allowReplace)
      })
      this.savingRep = false
      if (res.success) {
        this.repModalVisible = false
        this.detailModalVisible = false
        this.fetchCases()
      }
    },
    async loadMeta () {
      const res = await this.$store.dispatch('getAdminCaseManagementMeta')
      if (res.success && res.data && res.data.meta) {
        this.meta = res.data.meta
      }
    },
    onFilterChange () {
      this.currentPage = 1
      this.fetchCases()
    },
    async fetchCases () {
      const res = await this.$store.dispatch('getAdminActiveCases', {
        page: this.currentPage,
        mediatorId: this.filters.mediatorId || undefined,
        firstPartyId: this.filters.firstPartyId || undefined,
        secondPartyId: this.filters.secondPartyId || undefined,
        status: this.filters.status || undefined
      })
      if (res.success && res.data) {
        this.cases = res.data.casesWithEvents || []
        this.totalCases = res.data.total || 0
      }
    },
    partyName (u) {
      if (!u) return '—'
      return u.name || '—'
    },
    partyDetail (u) {
      if (!u) return '—'
      const parts = [u.name, u.email, u.phone_number].filter(Boolean)
      return parts.join(' · ')
    },
    partyExtraLines (u) {
      if (!u) return '—'
      const parts = []
      if (u.email) parts.push(u.email)
      if (u.phone_number) parts.push(u.phone_number)
      const loc = [u.city, u.state].filter(Boolean).join(', ')
      if (loc) parts.push(loc)
      return parts.length ? parts.join(' · ') : '—'
    },
    onDetailModalHidden () {
      this.detailTab = 0
    },
    statusLabel (c) {
      if (c.case_statuses && c.case_statuses.name) return c.case_statuses.name
      return c.status || '—'
    },
    subStatusLabel (c) {
      if (c.case_sub_statuses && c.case_sub_statuses.name) return c.case_sub_statuses.name
      return c.sub_status || '—'
    },
    formatDate (dateString) {
      return this.$formatDateTime(dateString)
    },
    getMeetingStatus (start, end) {
      const now = new Date()
      const s = start ? new Date(start) : null
      const e = end ? new Date(end) : null
      if (!s || !e) {
        return { statusLabel: this.$t('adminCases.statusUnknown'), statusClass: 'status-unknown' }
      }
      if (now < s) return { statusLabel: this.$t('adminCases.statusUpcoming'), statusClass: 'status-upcoming' }
      if (now > e) return { statusLabel: this.$t('adminCases.statusPast'), statusClass: 'status-past' }
      return { statusLabel: this.$t('adminCases.statusOngoing'), statusClass: 'status-ongoing' }
    },
    ratingToStars (rating) {
      if (rating == null) return ''
      const value = Math.max(1, Math.min(5, Number(rating)))
      return '★'.repeat(value) + '☆'.repeat(5 - value)
    },
    meetingRows (events) {
      return (events || [])
        .slice()
        .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
        .map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          start: this.formatDate(e.start_datetime),
          end: this.formatDate(e.end_datetime),
          meeting_link: e.meeting_link,
          google_calendar_link: e.google_calendar_link,
          meeting_summary: e.meeting_summary,
          mediator_next_steps: e.mediator_next_steps,
          first_party_next_steps: e.first_party_next_steps,
          second_party_next_steps: e.second_party_next_steps,
          first_party_rating: e.first_party_rating,
          second_party_rating: e.second_party_rating,
          first_party_stars: this.ratingToStars(e.first_party_rating),
          second_party_stars: this.ratingToStars(e.second_party_rating),
          mediator_feedback_at: this.formatDate(e.mediator_feedback_at),
          first_party_feedback_at: this.formatDate(e.first_party_feedback_at),
          second_party_feedback_at: this.formatDate(e.second_party_feedback_at),
          ...this.getMeetingStatus(e.start_datetime, e.end_datetime)
        }))
    },
    practiceAreas (m) {
      if (!m.preferred_area_of_practice) return ''
      try {
        const parsed = JSON.parse(m.preferred_area_of_practice)
        if (Array.isArray(parsed)) return parsed.join(', ')
      } catch (e) {
        return m.preferred_area_of_practice
      }
      return ''
    },
    openDetailModal (c) {
      this.selectedCase = c
      this.selectedCaseCommission = Number(c.mediator_commission || 0)
      this.detailTab = 0
      this.detailModalVisible = true
    },
    openAssignModal (c) {
      this.caseForAssign = c
      this.selectedMediatorId = c.user_cases_mediatorTouser ? c.user_cases_mediatorTouser.id : null
      this.mediatorSearch = ''
      this.assignModalVisible = true
    },
    openAssignFromDetail () {
      this.detailModalVisible = false
      this.openAssignModal(this.selectedCase)
    },
    async confirmAssignMediator () {
      if (!this.caseForAssign || !this.selectedMediatorId) return
      const res = await this.$store.dispatch('adminAssignCaseMediator', {
        caseId: this.caseForAssign.id,
        mediatorId: this.selectedMediatorId
      })
      if (res.success) {
        this.assignModalVisible = false
        await this.fetchCases()
        await this.loadMeta()
      }
    },
    async saveCaseCommission () {
      if (!this.selectedCase) return
      const res = await this.$store.dispatch('updateCaseMediatorCommission', {
        caseId: this.selectedCase.id,
        mediator_commission: this.selectedCaseCommission
      })
      if (res.success) {
        this.selectedCase.mediator_commission = this.selectedCaseCommission
        this.fetchCases()
      }
    }
  }
}
</script>

<style scoped>
:deep(.card-header) {
  background-color: unset !important;
  border-bottom: unset !important;
}
.user-card {
  background-color: var(--kadr-surface-info);
  border: 1px solid var(--kadr-border);
}
.empty-state .text-muted {
  width: 100%;
  color: var(--kadr-text-muted) !important;
}
.admin-case-detail {
  font-size: 0.95rem;
}
.detail-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--kadr-border);
}
.detail-hero-badges {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
:deep(.detail-tab-nav) {
  flex-wrap: wrap;
  gap: 0.25rem;
}
:deep(.detail-tab-nav .nav-link) {
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
}
.detail-tab-body {
  padding-top: 1rem !important;
  min-height: 200px;
}
.detail-section {
  margin-bottom: 1.35rem;
}
.detail-section:last-child {
  margin-bottom: 0;
}
.detail-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-secondary);
  margin-bottom: 0.65rem;
}
.detail-dl dt {
  font-weight: 600;
  color: var(--kadr-text-secondary);
  font-size: 0.88rem;
}
.detail-dl dd {
  font-size: 0.9rem;
}
.detail-dl.compact dt,
.detail-dl.compact dd {
  font-size: 0.85rem;
  margin-bottom: 0.35rem;
}
.party-tile {
  border: 1px solid var(--kadr-border-info);
  border-radius: 10px;
  padding: 0.75rem 0.85rem;
  background: var(--kadr-surface-info);
  height: 100%;
}
.party-tile-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--kadr-text-muted);
  margin-bottom: 0.35rem;
}
.party-tile-main {
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
}
.party-tile-meta {
  font-size: 0.82rem;
  color: var(--kadr-text-secondary);
  margin: 0;
  line-height: 1.45;
  word-break: break-word;
}
.commission-box {
  border: 1px dashed var(--kadr-primary-soft-border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: var(--kadr-primary-soft);
}
.commission-input {
  max-width: 220px;
}
.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.timeline-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--kadr-border-info);
}
.timeline-list li:last-child {
  border-bottom: none;
}
.timeline-desc {
  color: var(--kadr-text-secondary);
  margin-top: 0.25rem;
}
.payments-table thead th {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--kadr-text-muted);
  border-bottom: 2px solid var(--kadr-border);
}
.payments-table tbody td {
  font-size: 0.88rem;
  vertical-align: middle;
}
.detail-modal-footer {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--kadr-border);
}
.agreed-terms-box {
  border: 1px solid var(--kadr-border-info);
  border-radius: 10px;
  padding: 0.85rem;
  background: var(--kadr-bg-surface);
  max-height: 320px;
  overflow: auto;
}
.agreed-terms-html {
  font-size: 0.9rem;
  line-height: 1.5;
}
.agreed-terms-html :deep(p:last-child) {
  margin-bottom: 0;
}
.docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  margin-top: 0.75rem;
}
.meeting-stack {
  display: grid;
  gap: 0.8rem;
}
.meeting-card {
  border: 1px solid var(--kadr-border-info);
  border-radius: 10px;
  background: var(--kadr-surface-info);
  padding: 0.85rem;
}
.meeting-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}
.meeting-head-actions {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex-wrap: wrap;
}
.meeting-status-tag {
  font-size: 0.72rem;
  font-weight: 600;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  border: 1px solid transparent;
}
.status-upcoming {
  color: var(--kadr-status-info-text);
  background: var(--kadr-status-info-bg);
  border-color: var(--kadr-status-info-bg);
}
.status-ongoing {
  color: var(--kadr-status-success-text);
  background: var(--kadr-status-success-bg);
  border-color: var(--kadr-status-success-bg);
}
.status-past {
  color: var(--kadr-status-secondary-text);
  background: var(--kadr-status-secondary-bg);
  border-color: var(--kadr-status-secondary-bg);
}
.status-unknown {
  color: var(--kadr-status-secondary-text);
  background: var(--kadr-status-secondary-bg);
  border-color: var(--kadr-status-secondary-bg);
}
.feedback-tabs {
  background: var(--kadr-bg-surface);
  border: 1px solid var(--kadr-border-info);
  border-radius: 8px;
  padding: 0.5rem;
}
.feedback-tabs :deep(.nav-pills .nav-link) {
  font-size: 0.8rem;
  padding: 0.35rem 0.7rem;
}
.feedback-tabs :deep(.nav-pills .nav-link.active) {
  background-color: var(--kadr-primary);
  color: white;
}
.feedback-tabs :deep(.tab-content) {
  border-top: 1px solid var(--kadr-border-info);
}
.feedback-box {
  border: 1px dashed var(--kadr-border-strong);
  border-radius: 8px;
  background: var(--kadr-bg-surface);
  padding: 0.6rem;
}
.feedback-box h6 {
  margin-bottom: 0.45rem;
}
.feedback-box p {
  margin-bottom: 0.35rem;
  font-size: 0.87rem;
}
.case-detail-modal {
  max-width: 1180px;
}

</style>
