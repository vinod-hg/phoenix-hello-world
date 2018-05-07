defmodule Hello.RoomOwnerSup do
  use DynamicSupervisor

  def start_link(opts) do
    DynamicSupervisor.start_link(__MODULE__, :ok, opts)
  end

  def start_room(room) do
    if :global.whereis_name(String.to_atom(room)) == :undefined do
      DynamicSupervisor.start_child(__MODULE__, {Hello.RoomOwner, room})
    else
      {:error, :already_started}
    end
  end


  def init(:ok) do
    DynamicSupervisor.init(strategy: :one_for_one)
  end

end
