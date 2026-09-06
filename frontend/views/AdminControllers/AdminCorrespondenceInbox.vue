<template>
  <b-container fluid class="admin-inbox-page kadr-animate-in">
    <kadr-page-header :title="$t('adminInbox.title')" :subtitle="$t('adminInbox.subtitle')" />
    <b-row class="inbox-layout-row">
      <b-col cols="12" lg="4" xl="4" class="inbox-col inbox-col-list mb-3 mb-xl-0">
        <iq-card class="h-100 inbox-card-fixed">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('adminInbox.threads') }}</h4>
          </template>
          <template v-slot:headerAction>
            <b-button size="sm" variant="primary" class="me-1" @click="openStartModal">{{ $t('adminInbox.new') }}</b-button>
            <b-button size="sm" variant="outline-secondary" :disabled="loadingThreads" @click="loadThreads">
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': loadingThreads }" aria-hidden="true" />
            </b-button>
          </template>
          <template v-slot:body>
            <div class="inbox-toolbar d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <div class="d-flex align-items-center flex-wrap gap-2 flex-grow-1">
                <b-badge v-if="totalUnreadInbox > 0" variant="danger" pill>{{ $t('adminInbox.unreadCount', { count: totalUnreadInbox }) }}</b-badge>
                <b-badge v-else variant="light" class="border text-muted">{{ $t('adminInbox.allCaughtUp') }}</b-badge>
                <b-form-checkbox v-model="filterUnreadOnly" switch class="mb-0 small inbox-unread-switch">
                  {{ $t('adminInbox.unreadOnly') }}
                </b-form-checkbox>
                <b-form-select
                  v-model="inboxSourceFilter"
                  size="sm"
                  class="inbox-source-filter ms-md-2"
                  style="max-width: 200px"
                  :options="inboxSourceOptions"
                />
              </div>
            </div>
            <b-form-input
              v-model="search"
              size="sm"
              class="mb-2"
              :placeholder="$t('adminInbox.filterThreadsPlaceholder')"
            />
            <div v-if="loadingThreads && !threads.length" class="text-muted py-4 text-center">{{ $t('adminInbox.loading') }}</div>
            <div v-else-if="!filteredThreads.length" class="text-muted py-4 text-center">{{ $t('adminInbox.noThreadsMatch') }}</div>
            <div v-else class="inbox-list">
              <button
                v-for="t in filteredThreads"
                :key="threadRowKey(t)"
                type="button"
                class="inbox-row"
                :class="{ active: isSelected(t), 'inbox-row--unread': (t.unread_count || 0) > 0 }"
                @click="selectThread(t)"
              >
                <div class="inbox-row-top">
                  <span class="inbox-case">
                    <b-badge :variant="inboxRowBadgeVariant(t)" class="me-1">{{ inboxRowKindLabel(t) }}</b-badge>
                    <template v-if="t.kind === 'case'">#{{ t.case_reference }}</template>
                    <template v-else-if="t.thread_origin === 'PORTAL'">{{ supportTopicShort(t.support_topic) }}</template>
                    <template v-else>{{ $t('adminInbox.lead') }}</template>
                    <b-badge v-if="(t.unread_count || 0) > 0" variant="danger" pill class="ms-1">{{ t.unread_count }}</b-badge>
                  </span>
                  <time class="inbox-time">{{ t.last_message_at ? formatShort(t.last_message_at) : '—' }}</time>
                </div>
                <div class="inbox-participant text-break">{{ t.participant_label }}</div>
                <div v-if="t.kind === 'website'" class="inbox-email small text-muted text-break">{{ t.lead_email }}</div>
                <div class="inbox-preview">{{ t.last_preview || (t.empty ? $t('adminInbox.noMessagesYet') : '—') }}</div>
              </button>
            </div>
          </template>
        </iq-card>
      </b-col>

      <b-col cols="12" lg="5" xl="4" class="inbox-col inbox-col-chat mb-3 mb-xl-0">
        <iq-card v-if="isCaseChatSelected" class="h-100 inbox-card-fixed">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('adminInbox.conversation') }}</h4>
          </template>
          <template v-slot:body>
            <p class="small text-muted mb-2 text-break">
              <b-badge variant="primary" class="me-1">{{ $t('adminInbox.case') }}</b-badge>
              <strong>{{ selected.participant_label }}</strong>
              <span class="text-muted"> · {{ $t('adminInbox.caseHash', { ref: selected.case_reference }) }}</span>
            </p>
            <div class="conversation-panel-inner">
              <CaseCorrespondencePanel
                v-if="adminUserId"
                :key="selected.case_id + selected.logical_channel"
                embedded
                variant="default"
                :case-id="selected.case_id"
                :user-id="adminUserId"
                user-type="ADMIN"
                mode="admin"
                :forced-channel="selected.logical_channel"
                :read-only="false"
              />
            </div>
          </template>
        </iq-card>
        <iq-card v-if="isWebsiteChatSelected" class="h-100 inbox-card-fixed">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ websitePanelTitle }}</h4>
          </template>
          <template v-slot:body>
            <p class="small text-muted mb-2 text-break">
              <b-badge :variant="selected.thread_origin === 'PORTAL' ? 'info' : 'warning'" class="me-1">
                {{ selected.thread_origin === 'PORTAL' ? $t('adminInbox.portal') : $t('adminInbox.website') }}
              </b-badge>
              <strong class="text-break">{{ selected.thread_title }}</strong>
            </p>
            <WebsiteInquiryThreadPanel
              v-if="adminUserId"
              :key="selected.thread_id"
              :thread-id="selected.thread_id"
              :admin-user-id="adminUserId"
              :visitor-email="selected.lead_email"
              :thread-origin="selected.thread_origin || 'WEBSITE'"
              :participant-display-name="websiteParticipantDisplayName"
              @thread-updated="loadThreads"
            />
          </template>
        </iq-card>
        <iq-card v-if="!isCaseChatSelected && !isWebsiteChatSelected" class="h-100">
          <template v-slot:body>
            <p class="text-muted mb-0">{{ $t('adminInbox.selectThreadHint') }}</p>
          </template>
        </iq-card>
      </b-col>

      <b-col cols="12" lg="3" xl="4" class="inbox-col inbox-col-context">
        <iq-card v-if="isCaseChatSelected" class="h-100 context-card-wrap case-360-card">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('adminInbox.case360') }}</h4>
          </template>
          <template v-slot:headerAction>
            <span class="c360-header-hint text-muted small d-none d-md-inline">{{ $t('adminInbox.atAGlance') }}</span>
          </template>
          <template v-slot:body>
            <div class="case-360">
              <div class="c360-identity">
                <div class="c360-ref-row d-flex flex-wrap align-items-start justify-content-between gap-2">
                  <div class="min-w-0">
                    <div class="c360-ref text-break">{{ context.case.caseId || $t('adminInbox.case') }}</div>
                    <div class="c360-meta text-muted">
                      {{ $t('adminInbox.opened', { date: formatDate(context.case.created_at) }) }}
                      <span v-if="context.case.updated_at"> · {{ $t('adminInbox.updated', { date: formatDate(context.case.updated_at) }) }}</span>
                    </div>
                  </div>
                  <div class="c360-chips flex-shrink-0">
                    <span class="c360-chip c360-chip--status">{{ statusLabel(context.case) }}</span>
                    <span class="c360-chip c360-chip--muted">{{ subStatusLabel(context.case) }}</span>
                  </div>
                </div>
              </div>

              <b-tabs v-model="c360TabIndex" pills small class="c360-tabs" nav-class="c360-tab-nav flex-nowrap flex-md-wrap" content-class="c360-tab-content">
                <b-tab>
                  <template #title>
                    <span class="c360-tab-label">{{ $t('adminInbox.summary') }}</span>
                  </template>
                  <div class="c360-tab-pane-scroll">
                    <section class="c360-section c360-section--flush">
                      <h6 class="c360-section-title">{{ $t('adminInbox.caseDetails') }}</h6>
                      <div class="c360-kv">
                        <div class="c360-kv-item">
                          <span class="c360-k">{{ $t('adminInbox.category') }}</span>
                          <span class="c360-v text-break">{{ context.case.category || '—' }}</span>
                        </div>
                        <div class="c360-kv-item">
                          <span class="c360-k">{{ $t('adminInbox.caseType') }}</span>
                          <span class="c360-v text-break">{{ context.case.case_type || '—' }}</span>
                        </div>
                        <div class="c360-kv-item c360-kv-item--full">
                          <span class="c360-k">{{ $t('adminInbox.mediatorShare') }}</span>
                          <span class="c360-v">{{ $t('adminInbox.mediatorShareValue', { percent: Number(context.case.mediator_commission || 0).toFixed(2) }) }}</span>
                        </div>
                      </div>
                      <div class="c360-desc-block mt-2">
                        <span class="c360-k">{{ $t('adminInbox.description') }}</span>
                        <p v-if="!context.case.description" class="c360-empty small mb-0 mt-1">{{ $t('adminInbox.noDescription') }}</p>
                        <template v-else>
                          <p class="c360-v text-break mb-1 mt-1">{{ c360DescriptionVisible }}</p>
                          <b-button
                            v-if="c360DescriptionIsLong"
                            variant="link"
                            size="sm"
                            class="c360-toggle-desc p-0"
                            @click="c360DescriptionExpanded = !c360DescriptionExpanded"
                          >
                            {{ c360DescriptionExpanded ? $t('adminInbox.showLess') : $t('adminInbox.showFullDescription') }}
                          </b-button>
                        </template>
                      </div>
                    </section>

                    <section class="c360-section">
                      <h6 class="c360-section-title">{{ $t('adminInbox.peopleOnCase') }}</h6>
                      <div class="c360-people">
                        <div class="c360-person">
                          <span class="c360-person-role">{{ $t('adminInbox.firstParty') }}</span>
                          <span class="c360-person-name text-break">{{ partyName(context.case.user_cases_first_partyTouser) }}</span>
                          <span class="c360-person-meta text-break">{{ partyExtraLines(context.case.user_cases_first_partyTouser) }}</span>
                        </div>
                        <div class="c360-person">
                          <span class="c360-person-role">{{ $t('adminInbox.secondParty') }}</span>
                          <span class="c360-person-name text-break">{{ partyName(context.case.user_cases_second_partyTouser) }}</span>
                          <span class="c360-person-meta text-break">{{ partyExtraLines(context.case.user_cases_second_partyTouser) }}</span>
                        </div>
                        <div class="c360-person">
                          <span class="c360-person-role">{{ $t('adminInbox.mediator') }}</span>
                          <span class="c360-person-name text-break">{{ context.case.user_cases_mediatorTouser ? partyName(context.case.user_cases_mediatorTouser) : $t('adminInbox.notAssigned') }}</span>
                          <span v-if="context.case.user_cases_mediatorTouser" class="c360-person-meta text-break">{{ partyExtraLines(context.case.user_cases_mediatorTouser) }}</span>
                        </div>
                      </div>
                    </section>
                  </div>
                </b-tab>

                <b-tab>
                  <template #title>
                    <span class="c360-tab-label">{{ $t('adminInbox.meetings') }}</span>
                    <b-badge v-if="c360MeetingCount > 0" pill variant="secondary" class="c360-tab-count">{{ c360MeetingCount }}</b-badge>
                  </template>
                  <div class="c360-tab-pane-scroll">
                    <p v-if="c360MeetingCount" class="text-muted small mb-2">{{ $t('adminInbox.openMeetingHint') }}</p>
                    <p v-else class="c360-empty small mb-0">{{ $t('adminInbox.noMeetings') }}</p>
                    <div v-if="c360MeetingCount" class="c360-meetings c360-meetings--compact">
                      <article v-for="meeting in c360MeetingsSorted" :key="meeting.id" class="c360-meeting c360-meeting--row">
                        <div class="c360-meeting-row-main">
                          <div class="min-w-0">
                            <div class="c360-meeting-title text-break">{{ meeting.title || $t('adminInbox.meeting') }}</div>
                            <div class="c360-meeting-when text-muted small text-break">{{ meeting.start }} – {{ meeting.end }}</div>
                          </div>
                          <span class="c360-meeting-badge">{{ meeting.statusLabel }}</span>
                        </div>
                        <div class="c360-meeting-row-actions">
                          <b-button v-if="meeting.meeting_link" size="sm" variant="outline-primary" :href="meeting.meeting_link" target="_blank" rel="noopener">{{ $t('adminInbox.join') }}</b-button>
                          <b-button v-if="meeting.google_calendar_link" size="sm" variant="outline-secondary" :href="meeting.google_calendar_link" target="_blank" rel="noopener">{{ $t('adminInbox.calendar') }}</b-button>
                          <b-button size="sm" variant="primary" class="ms-auto" @click="openC360MeetingDetail(meeting)">{{ $t('adminInbox.viewDetails') }}</b-button>
                        </div>
                      </article>
                    </div>
                  </div>
                </b-tab>

                <b-tab>
                  <template #title>
                    <span class="c360-tab-label">{{ $t('adminInbox.activity') }}</span>
                    <b-badge v-if="c360TimelineCount > 0" pill variant="secondary" class="c360-tab-count">{{ c360TimelineCount }}</b-badge>
                  </template>
                  <div class="c360-tab-pane-scroll">
                    <p v-if="c360TimelineCount" class="text-muted small mb-2">{{ $t('adminInbox.activityHint') }}</p>
                    <ul v-if="c360TimelineCount" class="c360-timeline list-unstyled small mb-0">
                      <li v-for="(h, idx) in context.case.case_history" :key="idx" class="c360-timeline-item">
                        <span class="c360-timeline-dot" aria-hidden="true" />
                        <div class="c360-timeline-body text-break">
                          <strong>{{ (h.case_events && h.case_events.title) || $t('adminInbox.event') }}</strong>
                          <span v-if="h.created_at" class="text-muted"> · {{ formatDate(h.created_at) }}</span>
                          <p v-if="h.case_events && h.case_events.description" class="mb-0 text-muted">{{ h.case_events.description }}</p>
                        </div>
                      </li>
                    </ul>
                    <p v-else class="c360-empty small mb-0">{{ $t('adminInbox.noTimeline') }}</p>
                  </div>
                </b-tab>

                <b-tab>
                  <template #title>
                    <span class="c360-tab-label">{{ $t('adminInbox.payments') }}</span>
                    <b-badge v-if="c360PaymentCount > 0" pill variant="secondary" class="c360-tab-count">{{ c360PaymentCount }}</b-badge>
                  </template>
                  <div class="c360-tab-pane-scroll">
                    <div v-if="c360PaymentCount" class="c360-pay-summary mb-3">
                      <div class="c360-pay-stat">
                        <span class="c360-pay-stat-k">{{ $t('adminInbox.successful') }}</span>
                        <span class="c360-pay-stat-v text-success">{{ c360PaymentsPaidCount }}</span>
                      </div>
                      <div class="c360-pay-stat">
                        <span class="c360-pay-stat-k">{{ $t('adminInbox.failed') }}</span>
                        <span class="c360-pay-stat-v" :class="c360PaymentsFailedCount ? 'text-danger' : 'text-muted'">{{ c360PaymentsFailedCount }}</span>
                      </div>
                      <div class="c360-pay-stat c360-pay-stat--wide">
                        <span class="c360-pay-stat-k">{{ $t('adminInbox.recordedTotal') }}</span>
                        <span class="c360-pay-stat-v text-break">{{ c360PaymentsPaidTotalLabel }}</span>
                      </div>
                    </div>
                    <p v-else class="c360-empty small mb-0">{{ $t('adminInbox.noPayments') }}</p>
                    <div v-if="c360PaymentCount" class="table-responsive c360-table-wrap">
                      <table class="table table-sm c360-table mb-0">
                        <thead><tr><th>{{ $t('adminInbox.date') }}</th><th>{{ $t('adminInbox.amount') }}</th><th>{{ $t('adminInbox.status') }}</th><th>{{ $t('adminInbox.reason') }}</th></tr></thead>
                        <tbody>
                          <tr v-for="tx in context.case.transactions" :key="tx.transaction_id">
                            <td class="text-nowrap">{{ formatDate(tx.transaction_date) }}</td>
                            <td>{{ tx.amount }} {{ tx.currency || '' }}</td>
                            <td><b-badge :variant="tx.success ? 'success' : 'danger'" class="text-uppercase">{{ tx.success ? $t('adminInbox.paid') : $t('adminInbox.failed') }}</b-badge></td>
                            <td class="text-break">{{ tx.reason || '—' }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </b-tab>

                <b-tab>
                  <template #title>
                    <span class="c360-tab-label">{{ $t('adminInbox.documents') }}</span>
                  </template>
                  <div class="c360-tab-pane-scroll">
                    <section class="c360-section c360-section--flush">
                      <h6 class="c360-section-title">{{ $t('adminInbox.evidence') }}</h6>
                      <p v-if="!context.case.evidence_document_url" class="c360-empty small mb-0">{{ $t('adminInbox.noEvidence') }}</p>
                      <FilePreview v-else :url="context.case.evidence_document_url" :name="$t('adminInbox.evidenceDocument')" />
                    </section>
                    <section class="c360-section">
                      <h6 class="c360-section-title">{{ $t('adminInbox.mediationAgreement') }}</h6>
                      <p v-if="!agreementRecord" class="c360-empty small mb-0">{{ $t('adminInbox.noAgreementRecord') }}</p>
                      <template v-else>
                        <div class="c360-kv c360-kv--compact mb-2">
                          <div class="c360-kv-item">
                            <span class="c360-k">{{ $t('adminInbox.drafted') }}</span>
                            <span class="c360-v">{{ formatDate(agreementRecord.created_at) }}</span>
                          </div>
                          <div class="c360-kv-item">
                            <span class="c360-k">{{ $t('adminInbox.firstPartySigned') }}</span>
                            <span class="c360-v">{{ agreementRecord.first_party_signature_datetime ? formatDate(agreementRecord.first_party_signature_datetime) : '—' }}</span>
                          </div>
                          <div class="c360-kv-item">
                            <span class="c360-k">{{ $t('adminInbox.secondPartySigned') }}</span>
                            <span class="c360-v">{{ agreementRecord.second_party_signature_datetime ? formatDate(agreementRecord.second_party_signature_datetime) : '—' }}</span>
                          </div>
                        </div>
                        <b-button v-if="agreementRecord.mediation_agreement_link" size="sm" variant="primary" :href="agreementRecord.mediation_agreement_link" target="_blank" rel="noopener" class="mb-2">{{ $t('adminInbox.openAgreementPdf') }}</b-button>
                        <FilePreview v-if="agreementRecord.mediation_agreement_link" :url="agreementRecord.mediation_agreement_link" :name="$t('adminInbox.agreementPreview')" />
                      </template>
                    </section>
                  </div>
                </b-tab>
              </b-tabs>
            </div>
          </template>
        </iq-card>
        <iq-card v-if="isWebsiteChatSelected" class="h-100 context-card-wrap case-360-card">
          <template v-slot:headerTitle>
            <h4 class="card-title mb-0">{{ $t('adminInbox.inquiryDetails') }}</h4>
          </template>
          <template v-slot:body>
            <div class="context-scroll case-360">
              <div class="c360-identity">
                <div class="c360-ref text-break">{{ selected.thread_title || $t('adminInbox.inquiry') }}</div>
                <div class="c360-meta text-muted">
                  <template v-if="selected.thread_origin === 'PORTAL'">{{ $t('adminInbox.loggedInUserGeneralSupport') }}</template>
                  <template v-else>{{ $t('adminInbox.publicWebsiteForm') }}</template>
                </div>
                <div class="c360-chips">
                  <span class="c360-chip c360-chip--status">{{ selected.thread_origin === 'PORTAL' ? $t('adminInbox.portalSupport') : $t('adminInbox.websiteLead') }}</span>
                  <span v-if="selected.thread_origin === 'PORTAL' && selected.support_topic" class="c360-chip c360-chip--muted">{{ supportTopicShort(selected.support_topic) }}</span>
                </div>
              </div>
              <section class="c360-section">
                <h6 class="c360-section-title">{{ $t('adminInbox.contact') }}</h6>
                <div class="c360-kv">
                  <div v-if="selected.visitor_name" class="c360-kv-item c360-kv-item--full">
                    <span class="c360-k">{{ $t('adminInbox.name') }}</span>
                    <span class="c360-v text-break">{{ selected.visitor_name }}</span>
                  </div>
                  <div class="c360-kv-item c360-kv-item--full">
                    <span class="c360-k">{{ $t('adminInbox.email') }}</span>
                    <span class="c360-v text-break">{{ selected.lead_email }}</span>
                  </div>
                  <div class="c360-kv-item">
                    <span class="c360-k">{{ $t('adminInbox.phone') }}</span>
                    <span class="c360-v">{{ selected.lead_phone || '—' }}</span>
                  </div>
                </div>
              </section>
              <section v-if="selected.thread_origin === 'PORTAL' && selected.portal_user" class="c360-section">
                <h6 class="c360-section-title">{{ $t('adminInbox.portalAccount') }}</h6>
                <div class="c360-kv">
                  <div class="c360-kv-item c360-kv-item--full">
                    <span class="c360-k">{{ $t('adminInbox.displayName') }}</span>
                    <span class="c360-v text-break">{{ selected.portal_user.name || '—' }}</span>
                  </div>
                  <div class="c360-kv-item c360-kv-item--full">
                    <span class="c360-k">{{ $t('adminInbox.accountEmail') }}</span>
                    <span class="c360-v text-break">{{ selected.portal_user.email || '—' }}</span>
                  </div>
                  <div class="c360-kv-item">
                    <span class="c360-k">{{ $t('adminInbox.role') }}</span>
                    <span class="c360-v">{{ selected.portal_user.user_type || '—' }}</span>
                  </div>
                </div>
              </section>
            </div>
          </template>
        </iq-card>
        <div v-if="isCaseChatSelected && loadingContext" class="text-muted small p-3 border rounded bg-white">{{ $t('adminInbox.loadingCase360') }}</div>
        <iq-card v-if="!isCaseChatSelected && !isWebsiteChatSelected" class="h-100 muted-placeholder">
          <template v-slot:body>
            <p class="text-muted small mb-0">{{ $t('adminInbox.case360Placeholder') }}</p>
          </template>
        </iq-card>
      </b-col>
    </b-row>

    <b-modal
      v-model="startModalVisible"
      :title="startModalTitle"
      size="lg"
      no-footer
      @hidden="onStartModalHidden"
    >
      <div v-if="startWizardStep === 1" class="start-wizard-step">
        <p class="text-muted small mb-2">
          <strong>{{ $t('adminInbox.step1of2') }}</strong> — {{ $t('adminInbox.step1Hint') }}
        </p>
        <b-form-input v-model="pickerSearch" size="sm" class="mb-2" :placeholder="$t('adminInbox.searchCasePlaceholder')" @input="onPickerSearchInput" />
        <div class="picker-list border rounded">
          <button
            v-for="c in pickerCases"
            :key="c.id"
            type="button"
            class="picker-row d-block w-100 text-start"
            :class="{ active: pickerCase && pickerCase.id === c.id }"
            @click="pickerCase = c"
          >
            <strong>#{{ c.caseId || c.id.slice(0, 8) }}</strong>
            <span class="text-muted small"> · {{ c.category || '—' }}</span>
            <div class="small text-muted">{{ partyName(c.user_cases_first_partyTouser) }} vs {{ partyName(c.user_cases_second_partyTouser) }}</div>
          </button>
          <div v-if="!pickerCases.length && !pickerLoading" class="p-3 text-muted small">{{ $t('adminInbox.noCasesFound') }}</div>
          <div v-if="pickerLoading" class="p-3 text-muted small">{{ $t('adminInbox.loading') }}</div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-2">
          <b-button size="sm" variant="outline-secondary" :disabled="pickerPage <= 1 || pickerLoading" @click="pickerPage--; loadPickerCases()">{{ $t('adminInbox.previous') }}</b-button>
          <span class="small text-muted">{{ $t('adminInbox.pageN', { page: pickerPage }) }}</span>
          <b-button size="sm" variant="outline-secondary" :disabled="pickerLoading || !pickerHasMore" @click="pickerPage++; loadPickerCases()">{{ $t('adminInbox.nextBtn') }}</b-button>
        </div>
      </div>

      <div v-else class="start-wizard-step">
        <p class="text-muted small mb-2">
          <strong>{{ $t('adminInbox.step2of2') }}</strong> — {{ $t('adminInbox.step2Hint') }}
        </p>
        <p v-if="pickerCase" class="small mb-3">
          {{ $t('adminInbox.caseLabel') }} <strong>#{{ pickerCase.caseId || pickerCase.id.slice(0, 8) }}</strong>
          <span class="text-muted"> · {{ pickerCase.category || '—' }}</span>
        </p>
        <div class="recipient-grid">
          <button
            v-for="r in recipientOptions"
            :key="r.logicalChannel"
            type="button"
            class="recipient-tile"
            :class="{ active: pickerRecipient && pickerRecipient.logicalChannel === r.logicalChannel, disabled: r.disabled }"
            :disabled="r.disabled"
            @click="!r.disabled && (pickerRecipient = r)"
          >
            <span class="recipient-line text-break">{{ r.roleLabel }} – {{ r.displayName }}</span>
            <span v-if="r.disabled" class="recipient-hint">{{ $t('adminInbox.assignRoleFirst') }}</span>
          </button>
        </div>
      </div>

      <div class="d-flex justify-content-end flex-wrap gap-2 mt-3 pt-2 border-top">
        <b-button variant="outline-secondary" @click="startModalVisible = false">{{ $t('adminInbox.cancel') }}</b-button>
        <b-button v-if="startWizardStep === 2" variant="outline-primary" @click="goWizardBack">{{ $t('adminInbox.back') }}</b-button>
        <b-button v-if="startWizardStep === 1" variant="primary" :disabled="!pickerCase" @click="goWizardStep2">{{ $t('adminInbox.continue') }}</b-button>
        <b-button v-if="startWizardStep === 2" variant="primary" :disabled="!canStartChat" @click="confirmStartThread">{{ $t('adminInbox.startChat') }}</b-button>
      </div>
    </b-modal>

    <b-modal
      v-model="c360MeetingModalVisible"
      :title="c360MeetingModalTitle"
      size="lg"
      ok-only
      :ok-title="$t('adminInbox.close')"
      scrollable
      @hidden="c360MeetingModalMeeting = null"
    >
      <div v-if="c360MeetingModalMeeting" class="c360-meeting-modal">
        <p class="text-muted small mb-3">
          <span class="text-break">{{ c360MeetingModalMeeting.start }} – {{ c360MeetingModalMeeting.end }}</span>
          <b-badge variant="light" class="border ms-2">{{ c360MeetingModalMeeting.statusLabel }}</b-badge>
        </p>
        <div class="c360-meeting-modal-actions mb-3">
          <b-button v-if="c360MeetingModalMeeting.meeting_link" size="sm" variant="outline-primary" :href="c360MeetingModalMeeting.meeting_link" target="_blank" rel="noopener">{{ $t('adminInbox.joinLink') }}</b-button>
          <b-button v-if="c360MeetingModalMeeting.google_calendar_link" size="sm" variant="outline-secondary" :href="c360MeetingModalMeeting.google_calendar_link" target="_blank" rel="noopener">{{ $t('adminInbox.googleCalendar') }}</b-button>
        </div>
        <div class="c360-feedback-grid">
          <div class="c360-fb-block">
            <span class="c360-fb-label">{{ $t('adminInbox.mediator') }}</span>
            <p class="c360-fb-line"><span class="c360-fb-k">{{ $t('adminInbox.summary') }}</span> {{ c360MeetingModalMeeting.meeting_summary || '—' }}</p>
            <p class="c360-fb-line"><span class="c360-fb-k">{{ $t('adminInbox.nextSteps') }}</span> {{ c360MeetingModalMeeting.mediator_next_steps || '—' }}</p>
            <p class="c360-fb-meta mb-0">{{ $t('adminInbox.submittedAt', { value: c360MeetingModalMeeting.mediator_feedback_at || '—' }) }}</p>
          </div>
          <div class="c360-fb-block">
            <span class="c360-fb-label">{{ $t('adminInbox.firstParty') }}</span>
            <p class="c360-fb-line">
              <span class="c360-fb-k">{{ $t('adminInbox.rating') }}</span>
              <template v-if="c360MeetingModalMeeting.first_party_rating != null">{{ c360MeetingModalMeeting.first_party_rating }}/5 {{ c360MeetingModalMeeting.first_party_stars }}</template>
              <template v-else>—</template>
            </p>
            <p class="c360-fb-line"><span class="c360-fb-k">{{ $t('adminInbox.nextSteps') }}</span> {{ c360MeetingModalMeeting.first_party_next_steps || '—' }}</p>
            <p class="c360-fb-meta mb-0">{{ $t('adminInbox.submittedAt', { value: c360MeetingModalMeeting.first_party_feedback_at || '—' }) }}</p>
          </div>
          <div class="c360-fb-block">
            <span class="c360-fb-label">{{ $t('adminInbox.secondParty') }}</span>
            <p class="c360-fb-line">
              <span class="c360-fb-k">{{ $t('adminInbox.rating') }}</span>
              <template v-if="c360MeetingModalMeeting.second_party_rating != null">{{ c360MeetingModalMeeting.second_party_rating }}/5 {{ c360MeetingModalMeeting.second_party_stars }}</template>
              <template v-else>—</template>
            </p>
            <p class="c360-fb-line"><span class="c360-fb-k">{{ $t('adminInbox.nextSteps') }}</span> {{ c360MeetingModalMeeting.second_party_next_steps || '—' }}</p>
            <p class="c360-fb-meta mb-0">{{ $t('adminInbox.submittedAt', { value: c360MeetingModalMeeting.second_party_feedback_at || '—' }) }}</p>
          </div>
        </div>
      </div>
    </b-modal>
  </b-container>
</template>

<script>
import { sofbox } from '../../config/pluginInit'
import CaseCorrespondencePanel from '../../components/CaseCorrespondencePanel.vue'
import WebsiteInquiryThreadPanel from '../../components/WebsiteInquiryThreadPanel.vue'
import FilePreview from '../../components/DocumentPreview.vue'
import KadrPageHeader from '../../components/kadr/KadrPageHeader.vue'

let pickerSearchTimer = null

export default {
  name: 'AdminCorrespondenceInbox',
  components: { CaseCorrespondencePanel, WebsiteInquiryThreadPanel, FilePreview, KadrPageHeader },
  data () {
    return {
      threads: [],
      loadingThreads: false,
      search: '',
      selected: null,
      context: null,
      loadingContext: false,
      startModalVisible: false,
      startWizardStep: 1,
      pickerCases: [],
      pickerCase: null,
      pickerRecipient: null,
      pickerSearch: '',
      pickerPage: 1,
      pickerTotal: 0,
      pickerLoading: false,
      /** Blocks $route.query watcher from overwriting selection while query is updating (e.g. ?lead= vs stale ?caseId=). */
      suppressRouteSelectionSync: false,
      filterUnreadOnly: false,
      inboxSourceFilter: 'all',
      c360TabIndex: 0,
      c360DescriptionExpanded: false,
      c360MeetingModalMeeting: null
    }
  },
  computed: {
    inboxSourceOptions () {
      return [
        { value: 'all', text: this.$t('adminInbox.srcAll') },
        { value: 'case', text: this.$t('adminInbox.srcCase') },
        { value: 'website', text: this.$t('adminInbox.srcWebsite') },
        { value: 'portal', text: this.$t('adminInbox.srcPortal') }
      ]
    },
    adminUserId () {
      return this.$store.getters.user && this.$store.getters.user.id
    },
    isCaseChatSelected () {
      return !!(this.selected && this.selected.kind === 'case')
    },
    isWebsiteChatSelected () {
      return !!(this.selected && this.selected.kind === 'website')
    },
    websitePanelTitle () {
      if (!this.selected || this.selected.kind !== 'website') return ''
      return this.selected.thread_origin === 'PORTAL' ? this.$t('adminInbox.portalSupport') : this.$t('adminInbox.websiteInquiry')
    },
    websiteParticipantDisplayName () {
      if (!this.selected || this.selected.kind !== 'website') return ''
      if (this.selected.thread_origin === 'PORTAL') {
        return (this.selected.portal_user && this.selected.portal_user.name) ||
          (this.selected.visitor_name && String(this.selected.visitor_name).trim()) ||
          this.selected.lead_email || ''
      }
      return (this.selected.visitor_name && String(this.selected.visitor_name).trim()) || this.selected.lead_email || ''
    },
    agreementRecord () {
      return this.context && this.context.case ? this.context.case.case_agreement_tracking : null
    },
    startModalTitle () {
      return this.startWizardStep === 1 ? this.$t('adminInbox.startChooseCase') : this.$t('adminInbox.startChoosePerson')
    },
    totalUnreadInbox () {
      return this.threads.reduce((sum, t) => sum + (Number(t.unread_count) || 0), 0)
    },
    recipientOptions () {
      if (!this.pickerCase) return []
      const c = this.pickerCase
      return [
        {
          logicalChannel: 'ADMIN_MEDIATOR',
          roleLabel: this.$t('adminInbox.mediator'),
          displayName: c.user_cases_mediatorTouser ? this.partyName(c.user_cases_mediatorTouser) : this.$t('adminInbox.notAssigned'),
          disabled: !c.user_cases_mediatorTouser
        },
        {
          logicalChannel: 'ADMIN_FIRST_PARTY',
          roleLabel: this.$t('adminInbox.firstParty'),
          displayName: this.partyName(c.user_cases_first_partyTouser),
          disabled: !c.user_cases_first_partyTouser
        },
        {
          logicalChannel: 'ADMIN_SECOND_PARTY',
          roleLabel: this.$t('adminInbox.secondParty'),
          displayName: this.partyName(c.user_cases_second_partyTouser),
          disabled: !c.user_cases_second_partyTouser
        }
      ]
    },
    filteredThreads () {
      let list = this.threads
      if (this.filterUnreadOnly) {
        list = list.filter((t) => (Number(t.unread_count) || 0) > 0)
      }
      if (this.inboxSourceFilter === 'case') {
        list = list.filter((t) => t.kind === 'case')
      } else if (this.inboxSourceFilter === 'website') {
        list = list.filter((t) => t.kind === 'website' && t.thread_origin !== 'PORTAL')
      } else if (this.inboxSourceFilter === 'portal') {
        list = list.filter((t) => t.kind === 'website' && t.thread_origin === 'PORTAL')
      }
      const q = (this.search || '').trim().toLowerCase()
      if (!q) return list
      return list.filter((t) => {
        const blob = [
          t.kind,
          t.case_reference,
          t.participant_label,
          t.thread_title,
          t.lead_email,
          t.visitor_name,
          t.support_topic,
          t.channel_label,
          t.last_preview,
          t.category || ''
        ].join(' ').toLowerCase()
        return blob.includes(q)
      })
    },
    pickerHasMore () {
      return this.pickerPage * 15 < this.pickerTotal
    },
    canStartChat () {
      return !!(this.pickerCase && this.pickerRecipient && !this.pickerRecipient.disabled)
    },
    c360MeetingModalVisible: {
      get () {
        return !!this.c360MeetingModalMeeting
      },
      set (v) {
        if (!v) this.c360MeetingModalMeeting = null
      }
    },
    c360MeetingModalTitle () {
      const m = this.c360MeetingModalMeeting
      if (!m) return this.$t('adminInbox.meetingDetails')
      return m.title ? this.$t('adminInbox.meetingWithTitle', { title: m.title }) : this.$t('adminInbox.meetingDetails')
    },
    c360DescriptionFull () {
      if (!this.context || !this.context.case) return ''
      return (this.context.case.description || '').trim()
    },
    c360DescriptionIsLong () {
      return this.c360DescriptionFull.length > 200
    },
    c360DescriptionVisible () {
      const t = this.c360DescriptionFull
      if (!t) return ''
      if (!this.c360DescriptionIsLong || this.c360DescriptionExpanded) return t
      return `${t.slice(0, 200).trim()}…`
    },
    c360MeetingsSorted () {
      if (!this.context || !this.context.case || !this.context.case.events) return []
      return this.meetingRows(this.context.case.events)
    },
    c360MeetingCount () {
      return (this.context && this.context.case && this.context.case.events && this.context.case.events.length) || 0
    },
    c360TimelineCount () {
      return (this.context && this.context.case && this.context.case.case_history && this.context.case.case_history.length) || 0
    },
    c360PaymentCount () {
      return (this.context && this.context.case && this.context.case.transactions && this.context.case.transactions.length) || 0
    },
    c360PaymentsPaidCount () {
      if (!this.context || !this.context.case || !this.context.case.transactions) return 0
      return this.context.case.transactions.filter((tx) => tx.success).length
    },
    c360PaymentsFailedCount () {
      if (!this.context || !this.context.case || !this.context.case.transactions) return 0
      return this.context.case.transactions.filter((tx) => !tx.success).length
    },
    c360PaymentsPaidTotalLabel () {
      if (!this.context || !this.context.case || !this.context.case.transactions) return '—'
      const paid = this.context.case.transactions.filter((tx) => tx.success)
      if (!paid.length) return '—'
      const byCur = {}
      for (const tx of paid) {
        const cur = ((tx.currency != null && String(tx.currency).trim()) || '—')
        const amt = parseFloat(tx.amount)
        if (!Number.isFinite(amt)) continue
        byCur[cur] = (byCur[cur] || 0) + amt
      }
      const keys = Object.keys(byCur)
      if (!keys.length) return '—'
      return keys.map((k) => `${byCur[k].toFixed(2)} ${k}`).join(' · ')
    }
  },
  mounted () {
    sofbox.index()
    this.loadThreads()
  },
  watch: {
    '$route.query': {
      deep: true,
      handler () {
        this.$nextTick(() => this.trySelectFromRoute())
      }
    },
    context (val) {
      if (val && val.case) {
        this.c360TabIndex = 0
        this.c360DescriptionExpanded = false
        this.c360MeetingModalMeeting = null
      }
    }
  },
  methods: {
    supportTopicShort (code) {
      const c = String(code || '').toUpperCase()
      const map = {
        GENERAL: this.$t('adminInbox.topicGeneral'),
        PORTAL: this.$t('adminInbox.topicPortal'),
        TECHNICAL: this.$t('adminInbox.topicTechnical'),
        CASE_RELATED: this.$t('adminInbox.topicCase')
      }
      return map[c] || c || ''
    },
    inboxRowKindLabel (t) {
      if (t.kind === 'case') return this.$t('adminInbox.case')
      return t.thread_origin === 'PORTAL' ? this.$t('adminInbox.portal') : this.$t('adminInbox.website')
    },
    inboxRowBadgeVariant (t) {
      if (t.kind === 'case') return 'primary'
      return t.thread_origin === 'PORTAL' ? 'info' : 'warning'
    },
    threadRowKey (t) {
      if (t.kind === 'website') return `web:${t.thread_id}`
      return `case:${t.case_id}:${t.logical_channel}`
    },
    channelLabel (logical) {
      return this.$t('adminInbox.caseChat')
    },
    participantLabelFor (c, logical) {
      if (logical === 'ADMIN_MEDIATOR') {
        return c.user_cases_mediatorTouser ? this.$t('adminInbox.mediatorWithName', { name: c.user_cases_mediatorTouser.name }) : this.$t('adminInbox.mediatorUnassigned')
      }
      if (logical === 'ADMIN_FIRST_PARTY') {
        return c.user_cases_first_partyTouser ? this.$t('adminInbox.firstPartyWithName', { name: c.user_cases_first_partyTouser.name }) : this.$t('adminInbox.firstParty')
      }
      return c.user_cases_second_partyTouser ? this.$t('adminInbox.secondPartyWithName', { name: c.user_cases_second_partyTouser.name }) : this.$t('adminInbox.secondParty')
    },
    formatShort (d) {
      return this.$formatDateTime(d)
    },
    formatDate (dateString) {
      return this.$formatDateTime(dateString)
    },
    statusLabel (c) {
      if (c.case_statuses && c.case_statuses.name) return c.case_statuses.name
      return c.status || '—'
    },
    subStatusLabel (c) {
      if (c.case_sub_statuses && c.case_sub_statuses.name) return c.case_sub_statuses.name
      return c.sub_status || '—'
    },
    partyName (u) {
      if (!u) return '—'
      return u.name || '—'
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
    getMeetingStatus (start, end) {
      const now = new Date()
      const s = start ? new Date(start) : null
      const e = end ? new Date(end) : null
      if (!s || !e) return { statusLabel: this.$t('adminInbox.statusUnknown'), statusClass: 'status-unknown' }
      if (now < s) return { statusLabel: this.$t('adminInbox.statusUpcoming'), statusClass: 'status-upcoming' }
      if (now > e) return { statusLabel: this.$t('adminInbox.statusPast'), statusClass: 'status-past' }
      return { statusLabel: this.$t('adminInbox.statusOngoing'), statusClass: 'status-ongoing' }
    },
    ratingToStars (rating) {
      if (rating == null) return ''
      const value = Math.max(1, Math.min(5, Number(rating)))
      return '★'.repeat(value) + '☆'.repeat(5 - value)
    },
    openC360MeetingDetail (meeting) {
      this.c360MeetingModalMeeting = meeting
    },
    meetingRows (events) {
      return (events || [])
        .slice()
        .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
        .map(e => ({
          id: e.id,
          title: e.title,
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
    isSelected (t) {
      if (!this.selected) return false
      if (t.kind !== this.selected.kind) return false
      if (t.kind === 'website') return String(this.selected.thread_id) === String(t.thread_id)
      return this.selected.case_id === t.case_id && this.selected.logical_channel === t.logical_channel
    },
    async loadThreads () {
      this.loadingThreads = true
      const [caseRes, webRes] = await Promise.all([
        this.$store.dispatch('getAdminCorrespondenceInbox'),
        this.$store.dispatch('getAdminWebsiteContactInbox')
      ])
      this.loadingThreads = false
      const caseRows = (caseRes.success && caseRes.data && Array.isArray(caseRes.data.threads))
        ? caseRes.data.threads.map((t) => ({
          ...t,
          kind: 'case',
          channel_label: t.channel_label || this.$t('adminInbox.caseChat'),
          empty: !t.last_message_at,
          unread_count: Number(t.unread_count) || 0
        }))
        : []
      const webRows = (webRes.success && webRes.data && Array.isArray(webRes.data.threads))
        ? webRes.data.threads.map((w) => {
          const origin = w.thread_origin || 'WEBSITE'
          const topicShort = (code) => this.supportTopicShort(code)
          const portalName = w.portal_user && w.portal_user.name ? w.portal_user.name : null
          const visitor = w.visitor_name && String(w.visitor_name).trim() ? String(w.visitor_name).trim() : null
          let participant_label
          if (origin === 'PORTAL') {
            const pn = portalName || visitor || w.email
            participant_label = w.support_topic ? `${pn} · ${topicShort(w.support_topic)}` : pn
          } else {
            participant_label = visitor || w.title || w.email
          }
          return {
            ...w,
            kind: 'website',
            thread_id: w.thread_id,
            thread_title: w.title,
            lead_email: w.email,
            lead_phone: w.phone,
            visitor_name: w.visitor_name,
            thread_origin: origin,
            support_topic: w.support_topic,
            portal_user: w.portal_user || null,
            participant_label,
            case_reference: '—',
            logical_channel: null,
            channel_label: '',
            last_message_at: w.last_message_at,
            last_preview: w.last_preview || '',
            empty: false,
            unread_count: Number(w.unread_count) || 0
          }
        })
        : []
      this.threads = [...caseRows, ...webRows].sort((a, b) => {
        const ax = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const ay = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return ay - ax
      })
      this.$nextTick(() => this.trySelectFromRoute())
    },
    async trySelectFromRoute () {
      if (this.suppressRouteSelectionSync || this.loadingThreads || !this.threads.length) return
      const { caseId, channel, lead } = this.$route.query
      const leadStr = lead != null && lead !== '' ? String(lead) : ''
      if (leadStr) {
        const t = this.threads.find((x) => x.kind === 'website' && String(x.thread_id) === leadStr)
        if (t && !this.isSelected(t)) await this.selectThread(t, { skipRoute: true })
        return
      }
      if (caseId && channel) {
        const t = this.threads.find(
          (x) => x.kind === 'case' && x.case_id === caseId && x.logical_channel === channel
        )
        if (t && !this.isSelected(t)) await this.selectThread(t, { skipRoute: true })
      }
    },
    async selectThread (t, { skipRoute = false } = {}) {
      this.suppressRouteSelectionSync = true
      this.selected = t
      this.context = null
      try {
        if (t.kind === 'website') {
          this.loadingContext = false
          if (!skipRoute) {
            await this.$router.replace({
              name: 'app.messages',
              query: { lead: String(t.thread_id) }
            }).catch(() => {})
          }
        } else {
          this.loadingContext = true
          const res = await this.$store.dispatch('getAdminCorrespondenceContext', { caseId: t.case_id })
          this.loadingContext = false
          if (res.success && res.data) {
            this.context = res.data
          }
          if (!skipRoute) {
            await this.$router.replace({
              name: 'app.messages',
              query: { caseId: t.case_id, channel: t.logical_channel }
            }).catch(() => {})
          }
        }
      } catch (error) {
        console.error('Error selecting thread', error)
      } finally {
        await this.$nextTick()
        this.suppressRouteSelectionSync = false
      }
      await this.markThreadReadIfNeeded(t)
    },
    openStartModal () {
      this.startModalVisible = true
      this.startWizardStep = 1
      this.pickerCase = null
      this.pickerRecipient = null
      this.pickerPage = 1
      this.pickerSearch = ''
      this.loadPickerCases()
    },
    onStartModalHidden () {
      this.startWizardStep = 1
      this.pickerRecipient = null
      this.pickerCase = null
    },
    goWizardStep2 () {
      if (!this.pickerCase) return
      this.startWizardStep = 2
      this.pickerRecipient = null
    },
    goWizardBack () {
      this.startWizardStep = 1
      this.pickerRecipient = null
    },
    onPickerSearchInput () {
      clearTimeout(pickerSearchTimer)
      pickerSearchTimer = setTimeout(() => {
        this.pickerPage = 1
        this.loadPickerCases()
      }, 350)
    },
    async loadPickerCases () {
      this.pickerLoading = true
      try {
        const res = await this.$store.dispatch('getAdminCorrespondenceCasesForPicker', {
          page: this.pickerPage,
          search: this.pickerSearch
        })
        if (res.success && res.data) {
          this.pickerCases = res.data.casesWithEvents || []
          this.pickerTotal = res.data.total || 0
        } else {
          this.pickerCases = []
          this.pickerTotal = 0
        }
      } finally {
        this.pickerLoading = false
      }
    },
    confirmStartThread () {
      if (!this.canStartChat) return
      const c = this.pickerCase
      const logical = this.pickerRecipient.logicalChannel
      const synthetic = {
        kind: 'case',
        case_id: c.id,
        case_reference: c.caseId || c.id.slice(0, 8),
        logical_channel: logical,
        channel_label: this.channelLabel(logical),
        last_message_at: null,
        last_preview: '',
        participant_label: this.participantLabelFor(c, logical),
        empty: true,
        unread_count: 0
      }
      const exists = this.threads.some(
        (t) => t.kind === 'case' && t.case_id === synthetic.case_id && t.logical_channel === synthetic.logical_channel
      )
      if (!exists) {
        this.threads = [synthetic, ...this.threads]
      }
      this.startModalVisible = false
      this.selectThread(synthetic)
    },
    patchThreadUnread (t, n) {
      const idx = this.threads.findIndex((x) => {
        if (t.kind === 'website') return x.kind === 'website' && String(x.thread_id) === String(t.thread_id)
        return x.kind === 'case' && x.case_id === t.case_id && x.logical_channel === t.logical_channel
      })
      if (idx === -1) return
      const row = { ...this.threads[idx], unread_count: n }
      this.threads[idx] = row
      if (this.selected && this.isSelected(t)) {
        this.selected = { ...this.selected, unread_count: n }
      }
    },
    async markThreadReadIfNeeded (t) {
      if (!t) return
      let payload = null
      if (t.kind === 'case') {
        if (!t.case_id || !t.logical_channel) return
        payload = { kind: 'CASE', caseId: t.case_id, logicalChannel: t.logical_channel }
      } else if (t.kind === 'website') {
        if (!t.thread_id) return
        payload = { kind: 'WEBSITE', websiteThreadId: String(t.thread_id) }
      }
      if (!payload) return
      const res = await this.$store.dispatch('markAdminCorrespondenceInboxRead', payload)
      if (res.success) {
        this.patchThreadUnread(t, 0)
      }
    }
  }
}
</script>

<style scoped>
.admin-inbox-page {
  overflow-x: auto;
}
.inbox-layout-row {
  align-items: stretch;
}
.inbox-col {
  min-width: 0;
}
@media (min-width: 992px) {
  .inbox-col-context {
    min-width: 280px;
  }
  .inbox-col-list {
    max-width: 100%;
  }
}
@media (min-width: 1200px) {
  .inbox-col-context {
    min-width: 340px;
  }
}
.inbox-card-fixed :deep(.card) {
  min-height: 420px;
}
.conversation-panel-inner {
  min-width: 0;
  overflow: hidden;
}
.admin-inbox-page .inbox-list {
  max-height: min(560px, 70vh);
  overflow-y: auto;
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
}
.context-card-wrap {
  min-width: 0;
}
.context-scroll {
  max-height: min(78vh, 900px);
  overflow-y: auto;
  overflow-x: auto;
  padding-right: 2px;
}
.context-table-wrap {
  min-width: 100%;
}
.muted-placeholder {
  opacity: 0.85;
}
.ctx-tab-body {
  padding-top: 0.5rem;
  min-width: 0;
}
.inbox-row {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--kadr-border-info);
  background: var(--kadr-bg-surface);
  cursor: pointer;
}
.inbox-row:last-child {
  border-bottom: none;
}
.inbox-row:hover {
  background: var(--kadr-surface-muted);
}
.inbox-row.active {
  background: var(--kadr-primary-soft);
}
.inbox-row-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.inbox-case {
  font-weight: 600;
  color: var(--kadr-primary);
}
.inbox-time {
  font-size: 0.75rem;
  color: var(--kadr-text-muted);
  flex-shrink: 0;
}
.inbox-participant {
  font-size: 0.85rem;
  margin-top: 2px;
}
.inbox-preview {
  font-size: 0.78rem;
  color: var(--kadr-text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.context-dl dt {
  font-weight: 600;
  color: var(--kadr-text-muted);
}
.context-dl dd {
  margin-bottom: 0.35rem;
}
.party-tile-mini .label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--kadr-text-muted);
}
.tiny {
  font-size: 0.72rem;
}
.meeting-card-mini {
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  background: var(--kadr-surface-info);
  min-width: 0;
}
.timeline-list li {
  margin-bottom: 0.35rem;
}
.picker-list {
  max-height: 260px;
  overflow-y: auto;
}
.picker-row {
  padding: 0.5rem 0.75rem;
  border: none;
  border-bottom: 1px solid var(--kadr-border);
  background: var(--kadr-bg-surface);
  cursor: pointer;
}
.picker-row.active {
  background: var(--kadr-primary-soft);
}
.picker-row:hover {
  background: var(--kadr-surface-muted);
}
.recipient-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.recipient-tile {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.85rem 1rem;
  border: 2px solid var(--kadr-border-strong);
  border-radius: 10px;
  background: var(--kadr-surface-info);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.recipient-tile:hover:not(:disabled) {
  border-color: var(--kadr-primary);
  background: var(--kadr-primary-soft);
}
.recipient-tile.active {
  border-color: var(--kadr-primary);
  background: var(--kadr-primary-soft);
}
.recipient-tile.disabled,
.recipient-tile:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.recipient-line {
  display: block;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--kadr-primary);
}
.recipient-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--kadr-text-muted);
  margin-top: 0.35rem;
}
.inbox-unread-switch {
  white-space: nowrap;
}
.inbox-row--unread {
  border-left: 3px solid var(--kadr-danger);
  padding-left: 9px;
}
.inbox-row--unread:not(.active) {
  background: var(--kadr-status-danger-bg);
}
.case-360-card :deep(.card-body) {
  padding-top: 0.75rem;
}
.case-360 {
  font-size: 0.875rem;
  min-width: 0;
}
.c360-header-hint {
  max-width: 160px;
  text-align: right;
  line-height: 1.25;
}
.c360-tabs {
  margin-top: 0.35rem;
}
.c360-tabs :deep(.nav-pills .nav-link) {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.32rem 0.5rem;
  color: var(--kadr-text-secondary);
  border-radius: 6px;
  white-space: nowrap;
}
.c360-tabs :deep(.nav-pills .nav-link.active) {
  background: var(--kadr-primary);
  color: var(--kadr-text-on-primary);
}
.c360-tab-nav {
  flex-wrap: wrap;
  row-gap: 0.25rem;
  border-bottom: 1px solid var(--kadr-border);
  padding-bottom: 0.4rem;
  margin-bottom: 0;
}
.c360-tab-content {
  padding-top: 0;
  min-width: 0;
}
.c360-tab-pane-scroll {
  max-height: min(52vh, 480px);
  overflow-y: auto;
  padding-top: 0.35rem;
  padding-right: 2px;
}
.c360-tab-count {
  font-size: 0.62rem;
  vertical-align: middle;
  margin-left: 0.15rem;
  font-weight: 700;
}
.c360-section--flush {
  padding-top: 0;
}
.c360-desc-block .c360-v {
  font-weight: 400;
  line-height: 1.45;
  white-space: pre-wrap;
}
.c360-toggle-desc {
  font-size: 0.78rem;
}
.c360-meeting--row .c360-meeting-row-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.c360-meeting--row .c360-meeting-row-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.5rem;
  padding-top: 0.45rem;
  border-top: 1px solid var(--kadr-border-info);
}
.c360-meetings--compact .c360-meeting--row {
  padding: 0.55rem 0.65rem;
}
.c360-pay-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.c360-pay-stat {
  background: var(--kadr-surface-muted);
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  min-width: 0;
}
.c360-pay-stat--wide {
  grid-column: 1 / -1;
}
.c360-pay-stat-k {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-muted);
}
.c360-pay-stat-v {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--kadr-text-primary);
}
.c360-meeting-modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.c360-identity {
  padding: 0.75rem 0.85rem;
  margin: 0 0 0.75rem;
  background: linear-gradient(135deg, var(--kadr-surface-muted) 0%, var(--kadr-surface-info) 100%);
  border: 1px solid var(--kadr-border);
  border-radius: 10px;
}
.c360-ref {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--kadr-primary);
  letter-spacing: -0.02em;
}
.c360-meta {
  font-size: 0.78rem;
  margin-top: 0.25rem;
}
.c360-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}
.c360-chip {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--kadr-status-secondary-bg);
  color: var(--kadr-text-secondary);
}
.c360-chip--status {
  background: var(--kadr-status-info-bg);
  color: var(--kadr-status-info-text);
}
.c360-chip--muted {
  background: var(--kadr-status-secondary-bg);
  color: var(--kadr-text-muted);
}
.c360-section {
  margin-bottom: 1rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--kadr-border-info);
}
.c360-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.c360-section-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--kadr-text-muted);
  margin-bottom: 0.5rem;
}
.c360-kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.75rem;
}
.c360-kv--compact {
  grid-template-columns: 1fr;
}
.c360-kv-item {
  min-width: 0;
}
.c360-kv-item--full {
  grid-column: 1 / -1;
}
.c360-k {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--kadr-text-muted);
  margin-bottom: 0.15rem;
}
.c360-v {
  display: block;
  font-weight: 500;
  color: var(--kadr-text-primary);
}
.c360-empty {
  color: var(--kadr-text-muted);
}
.c360-people {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
}
@media (min-width: 400px) {
  .c360-people {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.c360-person {
  padding: 0.5rem 0.6rem;
  background: var(--kadr-surface-info);
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
  min-width: 0;
}
.c360-person-role {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--kadr-text-muted);
  margin-bottom: 0.2rem;
}
.c360-person-name {
  font-weight: 600;
  color: var(--kadr-primary);
  font-size: 0.82rem;
}
.c360-person-meta {
  display: block;
  font-size: 0.72rem;
  color: var(--kadr-text-muted);
  margin-top: 0.2rem;
}
.c360-meetings {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.c360-meeting {
  border: 1px solid var(--kadr-border);
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  background: var(--kadr-bg-surface);
}
.c360-meeting-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}
.c360-meeting-title {
  font-weight: 700;
  color: var(--kadr-text-primary);
  font-size: 0.85rem;
}
.c360-meeting-when {
  margin-top: 0.15rem;
}
.c360-meeting-badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  background: var(--kadr-status-secondary-bg);
  border: 1px solid var(--kadr-border-strong);
  color: var(--kadr-text-secondary);
}
.c360-meeting-actions {
  margin-top: 0.45rem;
}
.c360-feedback-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px dashed var(--kadr-border);
}
@media (min-width: 520px) {
  .c360-feedback-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.c360-fb-block {
  min-width: 0;
  padding: 0.35rem 0;
}
.c360-fb-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--kadr-text-secondary);
  margin-bottom: 0.35rem;
}
.c360-fb-line {
  font-size: 0.78rem;
  margin-bottom: 0.25rem;
  line-height: 1.35;
}
.c360-fb-k {
  font-weight: 600;
  color: var(--kadr-text-muted);
  margin-right: 0.25rem;
}
.c360-fb-meta {
  font-size: 0.72rem;
  color: var(--kadr-text-muted);
  margin-bottom: 0;
}
.c360-timeline {
  padding-left: 0;
}
.c360-timeline-item {
  position: relative;
  padding-left: 1rem;
  margin-bottom: 0.65rem;
}
.c360-timeline-item:last-child {
  margin-bottom: 0;
}
.c360-timeline-dot {
  position: absolute;
  left: 0;
  top: 0.35rem;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--kadr-primary);
}
.c360-timeline-body {
  border-left: 2px solid var(--kadr-border);
  padding-left: 0.5rem;
  margin-left: 2px;
}
.c360-table-wrap {
  border: 1px solid var(--kadr-border);
  border-radius: 8px;
}
.c360-table {
  font-size: 0.78rem;
}
.c360-table thead th {
  border-bottom: 1px solid var(--kadr-border);
  color: var(--kadr-text-muted);
  font-weight: 600;
  font-size: 0.68rem;
  text-transform: uppercase;
}
.c360-files-block + .c360-files-block {
  margin-top: 0.85rem;
  padding-top: 0.85rem;
  border-top: 1px dashed var(--kadr-border);
}
</style>
