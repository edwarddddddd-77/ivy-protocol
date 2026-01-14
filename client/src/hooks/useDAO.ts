import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import addresses from '@/contracts/addresses.json';
import abis from '@/contracts/abis.json';

/**
 * DAO Governance Hook (Lightweight Version)
 *
 * Features:
 * - Genesis Node holders can create proposals
 * - Genesis Node holders can vote (1 Node = 1 Vote)
 * - Minimum 127 participants for valid proposal
 * - 7-day voting period
 * - localStorage for proposal storage
 */

// Proposal types
export type ProposalType =
  | 'parameter_change'
  | 'feature_request'
  | 'partnership'
  | 'community_event'
  | 'other';

export const PROPOSAL_TYPES: { value: ProposalType; labelKey: string }[] = [
  { value: 'parameter_change', labelKey: 'dao.type_parameter' },
  { value: 'feature_request', labelKey: 'dao.type_feature' },
  { value: 'partnership', labelKey: 'dao.type_partnership' },
  { value: 'community_event', labelKey: 'dao.type_community' },
  { value: 'other', labelKey: 'dao.type_other' },
];

// Vote options
export type VoteOption = 'for' | 'against' | 'abstain';

// Proposal status
export type ProposalStatus = 'active' | 'passed' | 'rejected' | 'invalid';

// Vote record
export interface Vote {
  voter: string;
  option: VoteOption;
  nodeCount: number;
  timestamp: number;
}

// Proposal structure
export interface Proposal {
  id: string;
  type: ProposalType;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  endAt: number;
  votes: Vote[];
  status: ProposalStatus;
}

// Constants
const STORAGE_KEY = 'ivy_dao_proposals';
const VOTING_PERIOD_DAYS = 7;
const MIN_PARTICIPANTS = 127;

// Helper: Generate unique ID
const generateId = (): string => {
  return `IIP-${Date.now().toString(36).toUpperCase()}`;
};

// Helper: Calculate proposal status
const calculateStatus = (proposal: Proposal): ProposalStatus => {
  const now = Date.now();

  // Still in voting period
  if (now < proposal.endAt) {
    return 'active';
  }

  // Voting ended - calculate results
  const uniqueVoters = new Set(proposal.votes.map(v => v.voter.toLowerCase())).size;

  // Check minimum participation
  if (uniqueVoters < MIN_PARTICIPANTS) {
    return 'invalid';
  }

  // Count votes
  let forVotes = 0;
  let againstVotes = 0;

  proposal.votes.forEach(vote => {
    if (vote.option === 'for') forVotes += vote.nodeCount;
    else if (vote.option === 'against') againstVotes += vote.nodeCount;
  });

  return forVotes > againstVotes ? 'passed' : 'rejected';
};

export function useDAO() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // State
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [userNodeCount, setUserNodeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load proposals from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Proposal[];
        // Update status for each proposal
        const updated = parsed.map(p => ({
          ...p,
          status: calculateStatus(p),
        }));
        setProposals(updated);
      }
    } catch (e) {
      console.error('Failed to load proposals:', e);
    }
  }, []);

  // Save proposals to localStorage
  const saveProposals = useCallback((newProposals: Proposal[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProposals));
    } catch (e) {
      console.error('Failed to save proposals:', e);
    }
  }, []);

  // Fetch user's Genesis Node count
  const fetchUserNodeCount = useCallback(async () => {
    if (!publicClient || !address) {
      setUserNodeCount(0);
      return;
    }

    try {
      const balance = await publicClient.readContract({
        address: addresses.GenesisNode as `0x${string}`,
        abi: abis.GenesisNode,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      setUserNodeCount(Number(balance));
    } catch (error) {
      console.error('Failed to fetch node count:', error);
      setUserNodeCount(0);
    }
  }, [publicClient, address]);

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchUserNodeCount();
  }, [fetchUserNodeCount]);

  // Check if user can vote/create proposals
  const canParticipate = useMemo(() => {
    return isConnected && userNodeCount > 0;
  }, [isConnected, userNodeCount]);

  // Create proposal
  const createProposal = useCallback(async (
    type: ProposalType,
    title: string,
    description: string
  ): Promise<{ success: boolean; proposalId?: string; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (userNodeCount === 0) {
      return { success: false, error: 'Must hold Genesis Node to create proposal' };
    }

    const now = Date.now();
    const newProposal: Proposal = {
      id: generateId(),
      type,
      title,
      description,
      creator: address,
      createdAt: now,
      endAt: now + VOTING_PERIOD_DAYS * 24 * 60 * 60 * 1000,
      votes: [],
      status: 'active',
    };

    const updatedProposals = [newProposal, ...proposals];
    setProposals(updatedProposals);
    saveProposals(updatedProposals);

    return { success: true, proposalId: newProposal.id };
  }, [address, userNodeCount, proposals, saveProposals]);

  // Cast vote
  const castVote = useCallback(async (
    proposalId: string,
    option: VoteOption
  ): Promise<{ success: boolean; error?: string }> => {
    if (!address) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (userNodeCount === 0) {
      return { success: false, error: 'Must hold Genesis Node to vote' };
    }

    const proposalIndex = proposals.findIndex(p => p.id === proposalId);
    if (proposalIndex === -1) {
      return { success: false, error: 'Proposal not found' };
    }

    const proposal = proposals[proposalIndex];

    // Check if voting is still open
    if (Date.now() > proposal.endAt) {
      return { success: false, error: 'Voting period has ended' };
    }

    // Check if user already voted
    const existingVote = proposal.votes.find(
      v => v.voter.toLowerCase() === address.toLowerCase()
    );
    if (existingVote) {
      return { success: false, error: 'Already voted on this proposal' };
    }

    // Add vote
    const newVote: Vote = {
      voter: address,
      option,
      nodeCount: userNodeCount,
      timestamp: Date.now(),
    };

    const updatedProposal = {
      ...proposal,
      votes: [...proposal.votes, newVote],
    };

    const updatedProposals = [...proposals];
    updatedProposals[proposalIndex] = updatedProposal;

    setProposals(updatedProposals);
    saveProposals(updatedProposals);

    return { success: true };
  }, [address, userNodeCount, proposals, saveProposals]);

  // Get proposal by ID
  const getProposal = useCallback((id: string): Proposal | undefined => {
    return proposals.find(p => p.id === id);
  }, [proposals]);

  // Get user's vote for a proposal
  const getUserVote = useCallback((proposalId: string): Vote | undefined => {
    if (!address) return undefined;
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) return undefined;
    return proposal.votes.find(
      v => v.voter.toLowerCase() === address.toLowerCase()
    );
  }, [address, proposals]);

  // Get vote statistics for a proposal
  const getVoteStats = useCallback((proposalId: string) => {
    const proposal = proposals.find(p => p.id === proposalId);
    if (!proposal) {
      return { forVotes: 0, againstVotes: 0, abstainVotes: 0, totalVoters: 0, totalVotes: 0 };
    }

    let forVotes = 0;
    let againstVotes = 0;
    let abstainVotes = 0;

    proposal.votes.forEach(vote => {
      if (vote.option === 'for') forVotes += vote.nodeCount;
      else if (vote.option === 'against') againstVotes += vote.nodeCount;
      else abstainVotes += vote.nodeCount;
    });

    const uniqueVoters = new Set(proposal.votes.map(v => v.voter.toLowerCase())).size;
    const totalVotes = forVotes + againstVotes + abstainVotes;

    return { forVotes, againstVotes, abstainVotes, totalVoters: uniqueVoters, totalVotes };
  }, [proposals]);

  // Filter proposals by status
  const activeProposals = useMemo(() => {
    return proposals.filter(p => calculateStatus(p) === 'active');
  }, [proposals]);

  const closedProposals = useMemo(() => {
    return proposals.filter(p => calculateStatus(p) !== 'active');
  }, [proposals]);

  // Get user's voting history
  const userVotes = useMemo(() => {
    if (!address) return [];
    return proposals
      .filter(p => p.votes.some(v => v.voter.toLowerCase() === address.toLowerCase()))
      .map(p => ({
        proposal: p,
        vote: p.votes.find(v => v.voter.toLowerCase() === address.toLowerCase())!,
      }));
  }, [address, proposals]);

  return {
    // Data
    proposals,
    activeProposals,
    closedProposals,
    userNodeCount,
    canParticipate,
    isLoading,
    userVotes,
    // Constants
    minParticipants: MIN_PARTICIPANTS,
    votingPeriodDays: VOTING_PERIOD_DAYS,
    // Actions
    createProposal,
    castVote,
    getProposal,
    getUserVote,
    getVoteStats,
    fetchUserNodeCount,
  };
}
